import test from 'node:test';
import assert from 'node:assert/strict';
import { BarcodeScanDeduplicator, applyBarcodeScanToLines } from '../../../resources/js/Utils/barcodeScannerLogic.ts';

test('10 identical decodes within 2 seconds results in exactly 1 accepted scan', () => {
    const deduplicator = new BarcodeScanDeduplicator(2000);
    const barcode = '4790000000013';
    let acceptedCount = 0;

    // Simulate 10 video frame decodes within 1.5 seconds (0ms, 150ms, 300ms, ... 1350ms)
    for (let i = 0; i < 10; i++) {
        const timestamp = 1000 + i * 150;
        if (deduplicator.shouldAccept(barcode, timestamp)) {
            acceptedCount++;
        }
    }

    assert.equal(acceptedCount, 1, 'Only the first scan within the 2s cooldown must be accepted');
});

test('Second scan of the same barcode is accepted after 2s cooldown expires', () => {
    const deduplicator = new BarcodeScanDeduplicator(2000);
    const barcode = '4790000000013';

    // Scan at t = 1000ms
    assert.equal(deduplicator.shouldAccept(barcode, 1000), true);

    // Frame at t = 1800ms (800ms elapsed < 2000ms) -> rejected
    assert.equal(deduplicator.shouldAccept(barcode, 1800), false);

    // Frame at t = 2999ms (1999ms elapsed < 2000ms) -> rejected
    assert.equal(deduplicator.shouldAccept(barcode, 2999), false);

    // Frame at t = 3001ms (2001ms elapsed > 2000ms) -> accepted!
    assert.equal(deduplicator.shouldAccept(barcode, 3001), true);
});

test('Lock flag rejects all reads while a lookup request or modal is in progress', () => {
    const deduplicator = new BarcodeScanDeduplicator(2000);
    const barcode1 = '4790000000013';
    const barcode2 = '5901234567890';

    deduplicator.setLocked(true);

    assert.equal(deduplicator.shouldAccept(barcode1, 1000), false);
    assert.equal(deduplicator.shouldAccept(barcode2, 1050), false);

    deduplicator.setLocked(false);

    assert.equal(deduplicator.shouldAccept(barcode1, 1100), true);
});

test('Different barcodes have independent 2s cooldowns', () => {
    const deduplicator = new BarcodeScanDeduplicator(2000);
    const barcodeA = '4790000000001';
    const barcodeB = '4790000000002';

    // Scan A at t = 1000 -> accepted
    assert.equal(deduplicator.shouldAccept(barcodeA, 1000), true);

    // Scan B at t = 1200 (within 2s of A, but different code) -> accepted
    assert.equal(deduplicator.shouldAccept(barcodeB, 1200), true);

    // Immediate re-scan of A at t = 1300 -> rejected
    assert.equal(deduplicator.shouldAccept(barcodeA, 1300), false);

    // Immediate re-scan of B at t = 1400 -> rejected
    assert.equal(deduplicator.shouldAccept(barcodeB, 1400), false);
});

test('Re-scan of a barcode already in lines increments quantity on the existing line instead of adding a new line', () => {
    const initialLines = [];
    const metforminScanned = {
        variant_id: 101,
        brand_id: 202,
        display_name: 'Metformin 850 mg (Glucophage)',
        generic_name: 'Metformin',
        brand_name: 'Glucophage',
        base_unit: 'tablet',
        pack_size: 10,
    };

    // First scan creates line with qty 10
    const firstResult = applyBarcodeScanToLines(initialLines, metforminScanned);
    assert.equal(firstResult.action, 'added');
    assert.equal(firstResult.lines.length, 1);
    assert.equal(firstResult.lines[0].quantity, 10);

    // Second scan of same code increments existing line to qty 20
    const secondResult = applyBarcodeScanToLines(firstResult.lines, metforminScanned);
    assert.equal(secondResult.action, 'incremented');
    assert.equal(secondResult.lines.length, 1, 'Must NOT create a second line for the same medicine/brand');
    assert.equal(secondResult.lines[0].quantity, 20, 'Quantity must be incremented by pack size (10 + 10 = 20)');

    // Third scan increments again to qty 30
    const thirdResult = applyBarcodeScanToLines(secondResult.lines, metforminScanned);
    assert.equal(thirdResult.action, 'incremented');
    assert.equal(thirdResult.lines.length, 1);
    assert.equal(thirdResult.lines[0].quantity, 30);
});

test('Re-scan when multiple batches of same medicine exist increments the MOST RECENT line only', () => {
    const linesWithTwoBatches = [
        {
            medicine_variant_id: 101,
            medicine_brand_id: 202,
            display_name: 'Metformin 850 mg (Glucophage)',
            base_unit: 'tablet',
            batch_number: 'BATCH-001',
            expiry_date: '2027-01-01',
            pack_size: 10,
            quantity: 30,
            cost_price: '5.00',
            selling_price: '8.00',
        },
        {
            medicine_variant_id: 101,
            medicine_brand_id: 202,
            display_name: 'Metformin 850 mg (Glucophage)',
            base_unit: 'tablet',
            batch_number: 'BATCH-002',
            expiry_date: '2027-06-01',
            pack_size: 10,
            quantity: 20,
            cost_price: '5.50',
            selling_price: '8.50',
        },
    ];

    const metforminScanned = {
        variant_id: 101,
        brand_id: 202,
        display_name: 'Metformin 850 mg (Glucophage)',
        pack_size: 10,
    };

    const result = applyBarcodeScanToLines(linesWithTwoBatches, metforminScanned);
    assert.equal(result.action, 'incremented');
    assert.equal(result.lines.length, 2, 'Total lines must remain 2');
    assert.equal(result.lineIndex, 1, 'Must increment the most recent matching line (index 1)');
    assert.equal(result.lines[0].quantity, 30, 'Earlier batch line quantity must remain unchanged');
    assert.equal(result.lines[1].quantity, 30, 'Most recent batch line quantity must increment from 20 to 30');
});

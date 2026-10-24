<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

use App\Models\AuditEvent;
use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBarcode;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockImportService
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Canonical CSV/Excel headers.
     *
     * @var array<string>
     */
    public const HEADERS = [
        'barcode',
        'generic_name',
        'strength',
        'dosage_form',
        'brand_name',
        'manufacturer',
        'batch_number',
        'expiry_date',
        'quantity',
        'base_unit',
        'cost_price',
        'selling_price',
        'supplier_name',
        'invoice_number',
    ];

    /**
     * Header synonyms for smart auto-detection.
     *
     * @var array<string, array<string>>
     */
    public const SYNONYMS = [
        'barcode' => ['barcode', 'bar_code', 'upc', 'ean', 'sku'],
        'generic_name' => ['generic_name', 'generic', 'drug_name', 'medicine_name', 'drug', 'item_name', 'item', 'medicine', 'name'],
        'strength' => ['strength', 'dose', 'dosage', 'potency', 'strength_text'],
        'dosage_form' => ['dosage_form', 'form', 'type', 'presentation', 'formulation'],
        'brand_name' => ['brand_name', 'brand', 'trade_name', 'commercial_name'],
        'manufacturer' => ['manufacturer', 'mfg', 'maker', 'company', 'producer'],
        'batch_number' => ['batch_number', 'batch', 'batch_no', 'lot', 'lot_number', 'lot_no', 'batch_id', 'lot_id'],
        'expiry_date' => ['expiry_date', 'expiry', 'exp_date', 'exp', 'expiration', 'expiration_date', 'valid_till', 'best_before'],
        'quantity' => ['quantity', 'qty', 'units', 'stock_qty', 'count', 'amount'],
        'base_unit' => ['base_unit', 'unit', 'uom', 'pack_unit'],
        'cost_price' => ['cost_price', 'cost', 'unit_cost', 'purchase_price', 'buying_price', 'buy_price'],
        'selling_price' => ['selling_price', 'sell_price', 'mrp', 'retail_price', 'price'],
        'supplier_name' => ['supplier_name', 'supplier', 'vendor', 'distributor'],
        'invoice_number' => ['invoice_number', 'invoice_no', 'invoice', 'bill_no', 'bill_number', 'receipt_no', 'inv_no'],
    ];

    /**
     * Parse date strictly prioritizing Sri Lankan / International DD/MM format.
     * Handles DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, YYYY-MM-DD, and Excel serial dates.
     * "05/06/2027" is strictly parsed as 5th June 2027 (DD/MM), NEVER US MM/DD.
     */
    public static function parseSriLankanDate(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $raw = trim((string) $raw);
        if ($raw === '') {
            return null;
        }

        // 1. Excel serial number: integers between 20000 and 80000 (approx 1954 to 2119)
        if (is_numeric($raw) && (float) $raw >= 20000 && (float) $raw <= 80000 && ! str_contains($raw, '-') && ! str_contains($raw, '/') && ! str_contains($raw, '.')) {
            return Carbon::create(1899, 12, 30)->addDays((int) floor((float) $raw))->toDateString();
        }

        // 2. ISO format: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
        if (preg_match('/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/', $raw, $m)) {
            $year = (int) $m[1];
            $month = (int) $m[2];
            $day = (int) $m[3];
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        // 3. Strict Sri Lankan DD/MM priority: DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
        // Example: 05/06/2027 => day 5, month 6 (5 June 2027)
        if (preg_match('/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/', $raw, $m)) {
            $day = (int) $m[1];
            $month = (int) $m[2];
            $year = (int) $m[3];
            if ($year < 100) {
                $year += 2000;
            }
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        // 4. Fallback attempt via Carbon
        try {
            return Carbon::parse($raw)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Automatically map uploaded headers to canonical fields using exact matches & synonyms.
     *
     * @param  array<string>  $uploadedHeaders
     * @return array<string, string> Canonical field => uploaded header name
     */
    public function autoMapHeaders(array $uploadedHeaders): array
    {
        $normalizedUploaded = [];
        foreach ($uploadedHeaders as $orig) {
            $cleaned = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $orig) ?? ''));
            $cleaned = trim(preg_replace('/_+/', '_', $cleaned) ?? '', '_');
            $normalizedUploaded[$cleaned] = (string) $orig;
        }

        $mapping = [];
        foreach (self::HEADERS as $canonicalField) {
            $matchedHeader = null;

            // 1. Direct exact match
            if (isset($normalizedUploaded[$canonicalField])) {
                $matchedHeader = $normalizedUploaded[$canonicalField];
            } else {
                // 2. Check synonyms
                $synonyms = self::SYNONYMS[$canonicalField] ?? [];
                foreach ($synonyms as $synonym) {
                    if (isset($normalizedUploaded[$synonym])) {
                        $matchedHeader = $normalizedUploaded[$synonym];
                        break;
                    }
                }
            }

            if ($matchedHeader !== null) {
                $mapping[$canonicalField] = $matchedHeader;
            }
        }

        return $mapping;
    }

    /**
     * Generate sample CSV template content with 3 realistic example rows:
     * 1. Opening stock row (no supplier/invoice)
     * 2. Supplier invoice row 1 (GRN)
     * 3. Supplier invoice row 2 (same invoice/medicine, separate batch)
     */
    public function generateTemplateCsv(): string
    {
        $rows = $this->getTemplateSampleRows();

        $handle = fopen('php://temp', 'r+');
        if ($handle === false) {
            return '';
        }

        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv !== false ? $csv : '';
    }

    /**
     * Generate sample Excel (.xlsx) template content with 3 example rows and a "How to fill" instruction sheet.
     */
    public function generateTemplateXlsx(): string
    {
        $rows = $this->getTemplateSampleRows();
        $guideRows = $this->getHowToFillRows();
        $tempFile = tempnam(sys_get_temp_dir(), 'xlsx_');

        $zip = new \ZipArchive;
        $zip->open($tempFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>';

        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>';

        $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>';

        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Stock Template" sheetId="1" r:id="rId1"/>
    <sheet name="How to fill" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>';

        $renderSheet = function (array $sheetRows): string {
            $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n";
            $xml .= "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n";
            $xml .= "<sheetData>\n";
            foreach ($sheetRows as $rIdx => $row) {
                $rowNum = $rIdx + 1;
                $xml .= '<row r="'.$rowNum.'">'."\n";
                foreach ($row as $cIdx => $val) {
                    $colLetter = chr(65 + $cIdx);
                    $cellRef = $colLetter.$rowNum;
                    $escaped = htmlspecialchars((string) $val, ENT_XML1, 'UTF-8');
                    $xml .= '<c r="'.$cellRef.'" t="inlineStr"><is><t>'.$escaped."</t></is></c>\n";
                }
                $xml .= "</row>\n";
            }
            $xml .= '</sheetData></worksheet>';

            return $xml;
        };

        $zip->addFromString('[Content_Types].xml', $contentTypes);
        $zip->addFromString('_rels/.rels', $rels);
        $zip->addFromString('xl/_rels/workbook.xml.rels', $wbRels);
        $zip->addFromString('xl/workbook.xml', $workbook);
        $zip->addFromString('xl/worksheets/sheet1.xml', $renderSheet($rows));
        $zip->addFromString('xl/worksheets/sheet2.xml', $renderSheet($guideRows));
        $zip->close();

        $content = (string) file_get_contents($tempFile);
        @unlink($tempFile);

        return $content;
    }

    /**
     * Standard 3 example rows for template:
     * Row 1: Opening stock (no supplier, no invoice)
     * Row 2: Supplier invoice (GRN batch 1)
     * Row 3: Same supplier invoice (separate batch of the same medicine)
     *
     * @return array<array<string>>
     */
    public function getTemplateSampleRows(): array
    {
        return [
            self::HEADERS,
            [
                '',
                'Paracetamol',
                '500 mg',
                'Tablet',
                'Panadol',
                'GSK Sri Lanka',
                'PND-1044',
                '2027-08-31',
                '100',
                'tablet',
                '2.50',
                '4.00',
                '',
                '',
            ],
            [
                '',
                'Metformin',
                '850 mg',
                'Tablet',
                'Glucophage',
                'Merck',
                'B001',
                '2026-12-25',
                '30',
                'tablet',
                '12.50',
                '18.00',
                'State Pharmaceuticals',
                'INV-9921',
            ],
            [
                '',
                'Metformin',
                '850 mg',
                'Tablet',
                'Glucophage',
                'Merck',
                'B002',
                '2027-06-30',
                '20',
                'tablet',
                '12.50',
                '18.00',
                'State Pharmaceuticals',
                'INV-9921',
            ],
        ];
    }

    /**
     * Instruction rows for the "How to fill" sheet in the Excel template.
     *
     * @return array<array<string>>
     */
    public function getHowToFillRows(): array
    {
        return [
            ['Column Name', 'Required?', 'Accepted Format / Options', 'Description & Sri Lanka Context Rules'],
            ['generic_name', 'Required', 'Text (e.g. Paracetamol, Metformin)', 'Active ingredient name. Matched against clinic catalog or created if new.'],
            ['strength', 'Required', 'Text (e.g. 500 mg, 850 mg, 250 mg/5ml)', 'Dosage strength of the item.'],
            ['dosage_form', 'Optional', 'Tablet, Capsule, Syrup, Injection, Cream, etc.', 'Defaults to Tablet if left blank.'],
            ['brand_name', 'Optional', 'Text (e.g. Panadol, Glucophage)', 'Commercial/trade brand name.'],
            ['manufacturer', 'Optional', 'Text (e.g. GSK, Merck, SPMC)', 'Pharmaceutical manufacturer name.'],
            ['batch_number', 'Required', 'Text (e.g. B001, LOT-492)', 'Manufacturer batch number. Use "N/A" if untracked.'],
            ['expiry_date', 'Required', 'DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY', 'Must be in future. 05/06/2027 is read as 5 June 2027 (DD/MM priority).'],
            ['quantity', 'Required', 'Positive whole number (e.g. 100)', 'Number of base units received.'],
            ['base_unit', 'Optional', 'tablet, capsule, bottle, vial, ampoule', 'Unit of measurement. Defaults to tablet.'],
            ['cost_price', 'Optional', 'Decimal rupees (e.g. 12.50)', 'Cost per unit in Sri Lankan Rupees (LKR).'],
            ['selling_price', 'Optional', 'Decimal rupees (e.g. 18.00)', 'Patient retail price in LKR. Defaults to cost + 30% if blank.'],
            ['supplier_name', 'Optional', 'Text (e.g. State Pharmaceuticals)', 'Leave blank for Opening Stock. Provide with invoice for a GRN.'],
            ['invoice_number', 'Optional', 'Text (e.g. INV-9921, BILL-402)', 'Supplier invoice/bill number. Groups rows into GRN receipts.'],
        ];
    }

    /**
     * Parse and preview uploaded CSV or XLSX file with auto-matching, re-import checks, and duplicate warnings.
     *
     * @param  array<string, string>|null  $customMapping
     * @return array{
     *     total_rows: int,
     *     valid_count: int,
     *     warning_count: int,
     *     error_count: int,
     *     new_medicines_count: int,
     *     existing_medicines_count: int,
     *     batches_count: int,
     *     opening_stock_count: int,
     *     grn_groups_count: int,
     *     total_units: int,
     *     total_cost_cents: int,
     *     headers: array<string>,
     *     sample_rows: array<array<string>>,
     *     auto_mapping: array<string, string>,
     *     file_hash: string,
     *     is_duplicate_file: bool,
     *     duplicate_file_info: ?array<string, mixed>,
     *     duplicate_invoices: array<string>,
     *     preview: array<mixed>
     * }
     */
    public function parseAndPreview(UploadedFile $file, string $tenantId, ?array $customMapping = null): array
    {
        if ($file->getSize() > 5 * 1024 * 1024) {
            throw new InvalidArgumentException('Uploaded file exceeds maximum allowed size of 5 MB.');
        }

        $path = $file->getRealPath();
        if (! $path || ! file_exists($path)) {
            throw new InvalidArgumentException('Failed to read uploaded file.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if ($extension === 'xlsx') {
            $rawRows = $this->extractRowsFromXlsx($path);
        } else {
            $rawRows = $this->extractRowsFromCsv($path);
        }

        if (empty($rawRows)) {
            throw new InvalidArgumentException('Uploaded file is empty.');
        }

        $header = array_shift($rawRows);
        if (! $header) {
            throw new InvalidArgumentException('File has no header row.');
        }

        $detectedHeaders = array_values(array_filter(array_map('trim', $header), fn ($h) => $h !== ''));
        $autoMapping = $this->autoMapHeaders($detectedHeaders);
        $effectiveMapping = $customMapping ?: $autoMapping;

        // Build header index map from original header row
        $rawHeaderMap = [];
        foreach ($header as $idx => $name) {
            $cleanName = trim((string) $name);
            if ($cleanName !== '') {
                $rawHeaderMap[$cleanName] = $idx;
            }
        }

        // Compute file hash & check re-import protection
        $fileHash = hash_file('sha256', $path) ?: md5_file($path);
        $duplicateAudit = DB::table('audit_events')
            ->where('tenant_id', $tenantId)
            ->where('action', 'stock.imported')
            ->where('metadata->file_hash', $fileHash)
            ->latest()
            ->first();

        $isDuplicateFile = $duplicateAudit !== null;
        $duplicateFileInfo = $duplicateAudit ? [
            'imported_at' => $duplicateAudit->created_at,
            'metadata' => json_decode((string) $duplicateAudit->metadata, true),
        ] : null;

        // Sample first 3 data rows for mapping preview
        $sampleRows = [];
        $sampleCount = 0;
        foreach ($rawRows as $r) {
            if (! empty(array_filter($r, fn ($v) => trim((string) $v) !== ''))) {
                $sampleRows[] = array_map(fn ($v) => trim((string) $v), $r);
                $sampleCount++;
                if ($sampleCount >= 3) {
                    break;
                }
            }
        }

        // Collect all invoice numbers to detect existing duplicates in DB
        $allInvoices = [];
        foreach ($rawRows as $row) {
            $invHeader = $effectiveMapping['invoice_number'] ?? null;
            if ($invHeader && isset($rawHeaderMap[$invHeader])) {
                $inv = trim((string) ($row[$rawHeaderMap[$invHeader]] ?? ''));
                if ($inv !== '') {
                    $allInvoices[$inv] = true;
                }
            }
        }

        $existingInvoicesList = [];
        if (! empty($allInvoices)) {
            $existingInvoicesList = DB::table('stock_receipts')
                ->where('tenant_id', $tenantId)
                ->where('status', '!=', 'voided')
                ->whereIn('invoice_number', array_keys($allInvoices))
                ->pluck('invoice_number')
                ->toArray();
        }
        $existingInvoicesMap = array_flip($existingInvoicesList);

        $previewRows = [];
        $rowCount = 0;
        $maxRows = 2000;
        $validCount = 0;
        $warningCount = 0;
        $errorCount = 0;
        $newMedicinesCount = 0;
        $existingMedicinesCount = 0;
        $batchesCount = 0;
        $openingStockCount = 0;
        $grnGroups = [];
        $totalUnits = 0;
        $totalCostCents = 0;

        foreach ($rawRows as $row) {
            if ($rowCount >= $maxRows) {
                break;
            }
            $rowCount++;

            // Skip empty rows
            if (empty(array_filter($row, fn ($val) => trim((string) $val) !== ''))) {
                continue;
            }

            $rowData = [];
            foreach (self::HEADERS as $field) {
                $mappedColName = $effectiveMapping[$field] ?? null;
                $colIdx = $mappedColName !== null ? ($rawHeaderMap[$mappedColName] ?? null) : null;
                $rowData[$field] = $colIdx !== null && isset($row[$colIdx]) ? trim((string) $row[$colIdx]) : '';
            }

            $parsedRow = $this->matchAndValidateRow($rowData, $tenantId, $rowCount, $existingInvoicesMap);

            if ($parsedRow['status'] === 'error') {
                $errorCount++;
            } else {
                $validCount++;
                if (! empty($parsedRow['warnings'])) {
                    $warningCount++;
                }

                $qty = (int) ($parsedRow['data']['quantity'] ?? 0);
                $cost = (int) ($parsedRow['data']['cost_price_cents'] ?? 0);
                $totalUnits += $qty;
                $totalCostCents += ($qty * $cost);
                $batchesCount++;

                if ($parsedRow['status'] === 'new_medicine') {
                    $newMedicinesCount++;
                } else {
                    $existingMedicinesCount++;
                }

                $supp = trim((string) ($parsedRow['data']['supplier_name'] ?? ''));
                $inv = trim((string) ($parsedRow['data']['invoice_number'] ?? ''));
                if ($supp === '' && $inv === '') {
                    $openingStockCount++;
                } else {
                    $suppKey = ($supp ?: 'General').'___'.($inv ?: 'Opening');
                    $grnGroups[$suppKey] = true;
                }
            }

            $previewRows[] = $parsedRow;
        }

        return [
            'total_rows' => count($previewRows),
            'valid_count' => $validCount,
            'warning_count' => $warningCount,
            'error_count' => $errorCount,
            'new_medicines_count' => $newMedicinesCount,
            'existing_medicines_count' => $existingMedicinesCount,
            'batches_count' => $batchesCount,
            'opening_stock_count' => $openingStockCount,
            'grn_groups_count' => count($grnGroups),
            'total_units' => $totalUnits,
            'total_cost_cents' => $totalCostCents,
            'headers' => $detectedHeaders,
            'sample_rows' => $sampleRows,
            'auto_mapping' => $autoMapping,
            'file_hash' => $fileHash,
            'is_duplicate_file' => $isDuplicateFile,
            'duplicate_file_info' => $duplicateFileInfo,
            'duplicate_invoices' => array_values(array_unique($existingInvoicesList)),
            'preview' => $previewRows,
        ];
    }

    /**
     * Read rows from CSV file.
     *
     * @return array<array<string>>
     */
    protected function extractRowsFromCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new InvalidArgumentException('Cannot open uploaded CSV file.');
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    /**
     * Read rows from XLSX OpenXML archive using PHP ZipArchive & SimpleXML.
     *
     * @return array<array<string>>
     */
    protected function extractRowsFromXlsx(string $filePath): array
    {
        $zip = new \ZipArchive;
        if ($zip->open($filePath) !== true) {
            throw new InvalidArgumentException('Could not open Excel (.xlsx) file.');
        }

        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml !== false) {
            $xml = @simplexml_load_string($sharedStringsXml);
            if ($xml && isset($xml->si)) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            $text .= (string) ($r->t ?? '');
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/sheet') && str_ends_with($name, '.xml')) {
                    $sheetXml = $zip->getFromName($name);
                    break;
                }
            }
        }
        $zip->close();

        if ($sheetXml === false) {
            throw new InvalidArgumentException('Excel file does not contain a readable worksheet.');
        }

        $sheet = @simplexml_load_string($sheetXml);
        if (! $sheet || ! isset($sheet->sheetData)) {
            return [];
        }

        $rows = [];
        foreach ($sheet->sheetData->row as $rowNode) {
            $rowData = [];
            $lastCol = -1;
            foreach ($rowNode->c as $cell) {
                $cellRef = (string) $cell['r'];
                preg_match('/([A-Z]+)(\d+)/', $cellRef, $matches);
                $colLetters = $matches[1] ?? 'A';
                $colIdx = 0;
                for ($l = 0; $l < strlen($colLetters); $l++) {
                    $colIdx = $colIdx * 26 + (ord($colLetters[$l]) - ord('A') + 1);
                }
                $colIdx -= 1; // 0-indexed

                while ($lastCol + 1 < $colIdx) {
                    $rowData[] = '';
                    $lastCol++;
                }

                $type = (string) $cell['t'];
                $val = '';
                if ($type === 's') {
                    $idx = (int) $cell->v;
                    $val = $sharedStrings[$idx] ?? '';
                } elseif ($type === 'inlineStr') {
                    $val = (string) ($cell->is->t ?? '');
                } else {
                    $val = (string) ($cell->v ?? '');
                }

                $rowData[] = trim($val);
                $lastCol = $colIdx;
            }
            $rows[] = $rowData;
        }

        return $rows;
    }

    /**
     * Match a single row against catalog and validate fields.
     *
     * @param  array<string, string>  $row
     * @param  array<string, int>  $existingInvoicesMap
     * @return array<string, mixed>
     */
    protected function matchAndValidateRow(array $row, string $tenantId, int $rowNumber, array $existingInvoicesMap = []): array
    {
        $errors = [];
        $warnings = [];

        // Required fields
        if (trim($row['generic_name']) === '') {
            $errors[] = 'Generic name is required';
        }
        if (trim($row['strength']) === '') {
            $errors[] = 'Strength is required';
        }

        $rawQty = trim((string) ($row['quantity'] ?? ''));
        $qty = (int) $rawQty;
        if ($rawQty === '' || ! is_numeric($rawQty) || $qty <= 0) {
            $errors[] = 'Quantity must be a positive whole number';
        }

        // Batch number required (allow N/A)
        $batchNumber = trim((string) ($row['batch_number'] ?? ''));
        if ($batchNumber === '') {
            $errors[] = 'Batch number is required (use "N/A" if none)';
        }

        // Parse and validate Expiry Date (strict DD/MM priority for Sri Lanka context)
        $rawExpiry = trim((string) ($row['expiry_date'] ?? ''));
        $expiryDate = null;
        if ($rawExpiry === '') {
            $errors[] = 'Expiry date is required';
        } else {
            $expiryDate = self::parseSriLankanDate($rawExpiry);
            if (! $expiryDate) {
                $errors[] = 'Invalid expiry date format (use DD/MM/YYYY, YYYY-MM-DD, or DD.MM.YYYY)';
            } else {
                $today = now()->toDateString();
                if ($expiryDate <= $today) {
                    $errors[] = 'Expiry date must be in the future (already-expired stock is rejected)';
                } elseif ($expiryDate < now()->addDays(90)->toDateString()) {
                    $daysRemaining = (int) now()->diffInDays(Carbon::parse($expiryDate));
                    $warnings[] = "Near expiry: expires in {$daysRemaining} days (under 90 days)";
                }
            }
        }

        // Prices in Rupees -> will be cents
        $costPriceRupees = (float) ($row['cost_price'] ?: 0);
        $sellingPriceRupees = (float) ($row['selling_price'] ?: 0);

        if ($costPriceRupees < 0 || $sellingPriceRupees < 0) {
            $errors[] = 'Prices cannot be negative';
        } elseif ($sellingPriceRupees > 0 && $costPriceRupees > $sellingPriceRupees) {
            $warnings[] = sprintf('Selling price (Rs. %.2f) is below cost price (Rs. %.2f)', $sellingPriceRupees, $costPriceRupees);
        }

        // Check duplicate invoice warning
        $invoiceNum = trim((string) ($row['invoice_number'] ?? ''));
        if ($invoiceNum !== '' && isset($existingInvoicesMap[$invoiceNum])) {
            $warnings[] = "Invoice #{$invoiceNum} was already imported in an earlier GRN. Re-importing may duplicate stock.";
        }

        $dosageForm = ! empty($row['dosage_form']) ? ucfirst(strtolower(trim($row['dosage_form']))) : 'Tablet';
        $brandName = trim((string) ($row['brand_name'] ?? '')) ?: null;
        $barcode = trim((string) ($row['barcode'] ?? '')) ?: null;

        // Matching strategy against catalog and existing clinic stock
        $matchType = 'none';
        $matchedVariant = null;
        $matchedBrand = null;
        $existingClinicMedicine = null;

        // 1. Try barcode match
        if ($barcode) {
            $barcodeRecord = MedicineBarcode::with('brand.variant.medicine')
                ->where('barcode', $barcode)
                ->visibleToTenant($tenantId)
                ->first();

            if ($barcodeRecord && $barcodeRecord->brand) {
                $matchedBrand = $barcodeRecord->brand;
                $matchedVariant = $matchedBrand->variant;
                $matchType = 'barcode';
            }
        }

        // 2. Try Brand + Strength match
        if (! $matchedVariant && $brandName) {
            $brandRecord = MedicineBrand::with('variant.medicine')
                ->whereRaw('LOWER(brand_name) = ?', [strtolower($brandName)])
                ->whereHas('variant', function ($vq) use ($row) {
                    $vq->whereRaw('LOWER(strength_text) = ?', [strtolower(trim($row['strength']))]);
                })
                ->visibleToTenant($tenantId)
                ->first();

            if ($brandRecord) {
                $matchedBrand = $brandRecord;
                $matchedVariant = $brandRecord->variant;
                $matchType = 'brand_strength';
            }
        }

        // 3. Try Generic + Strength + DosageForm match
        if (! $matchedVariant && trim($row['generic_name']) !== '') {
            $variantRecord = MedicineVariant::with('medicine')
                ->whereRaw('LOWER(strength_text) = ?', [strtolower(trim($row['strength']))])
                ->whereRaw('LOWER(dosage_form) = ?', [strtolower($dosageForm)])
                ->whereHas('medicine', function ($mq) use ($row) {
                    $mq->whereRaw('LOWER(normalized_name) = ?', [strtolower(trim($row['generic_name']))]);
                })
                ->visibleToTenant($tenantId)
                ->first();

            if ($variantRecord) {
                $matchedVariant = $variantRecord;
                $matchType = 'generic_strength_form';
            }
        }

        // Check if existing ClinicMedicine already registered
        if ($matchedVariant) {
            $existingClinicMedicine = ClinicMedicine::where('tenant_id', $tenantId)
                ->where('medicine_variant_id', $matchedVariant->id)
                ->when($matchedBrand, fn ($q) => $q->where('medicine_brand_id', $matchedBrand->id))
                ->first();
        }

        if (! $matchedVariant) {
            $warnings[] = 'Unmatched catalog medicine: will be created as a new clinic catalog entry';
        }

        $status = ! empty($errors) ? 'error' : ($matchedVariant ? 'matched' : 'new_medicine');

        return [
            'row_index' => $rowNumber,
            'status' => $status,
            'match_type' => $matchType,
            'is_existing_medicine' => $existingClinicMedicine !== null,
            'existing_clinic_medicine_id' => $existingClinicMedicine?->id,
            'errors' => $errors,
            'warnings' => $warnings,
            'data' => [
                'barcode' => $barcode,
                'generic_name' => trim($row['generic_name']),
                'strength' => trim($row['strength']),
                'dosage_form' => $dosageForm,
                'brand_name' => $brandName,
                'manufacturer' => trim((string) ($row['manufacturer'] ?? '')) ?: null,
                'batch_number' => $batchNumber ?: 'N/A',
                'expiry_date' => $expiryDate,
                'quantity' => $qty,
                'base_unit' => strtolower(trim((string) ($row['base_unit'] ?? 'tablet')) ?: 'tablet'),
                'cost_price_cents' => (int) round($costPriceRupees * 100),
                'selling_price_cents' => (int) round($sellingPriceRupees * 100),
                'supplier_name' => trim((string) ($row['supplier_name'] ?? '')) ?: null,
                'invoice_number' => $invoiceNum ?: null,
            ],
            'matched' => $matchedVariant ? [
                'variant_id' => $matchedVariant->id,
                'brand_id' => $matchedBrand?->id,
                'medicine_name' => $matchedVariant->medicine->generic_name,
                'variant_display' => $matchedVariant->display_name,
                'brand_name' => $matchedBrand?->brand_name,
            ] : null,
        ];
    }

    /**
     * Confirm and execute the imported stock rows inside a single database transaction.
     * Rows without supplier and invoice are imported as opening stock (no GRN).
     * Rows with supplier+invoice create a GRN per supplier+invoice.
     *
     * @param  array<array<string, mixed>>  $rows
     */
    public function executeImport(array $rows, User $user, string $tenantId, ?string $fileHash = null, ?string $fileName = null): array
    {
        return DB::transaction(function () use ($rows, $user, $tenantId, $fileHash, $fileName) {
            $createdMedicines = 0;
            $createdBatches = 0;
            $createdReceipts = 0;
            $openingStockCount = 0;
            $totalInventoryValueCents = 0;
            $createdReceiptRecords = [];

            $groupedByGrn = [];
            $openingStockItems = [];

            foreach ($rows as $rowItem) {
                $data = $rowItem['data'] ?? $rowItem;
                $supplierName = trim((string) ($data['supplier_name'] ?? ''));
                $invoiceNum = trim((string) ($data['invoice_number'] ?? ''));

                if ($supplierName === '' && $invoiceNum === '') {
                    $openingStockItems[] = $rowItem;
                } else {
                    $supplierName = $supplierName !== '' ? $supplierName : 'General Supplier';
                    $invoiceNum = $invoiceNum !== '' ? $invoiceNum : 'IMPORT-'.date('Ymd');
                    $key = "{$supplierName}___{$invoiceNum}";

                    if (! isset($groupedByGrn[$key])) {
                        $groupedByGrn[$key] = [
                            'supplier_name' => $supplierName,
                            'invoice_number' => $invoiceNum,
                            'items' => [],
                        ];
                    }
                    $groupedByGrn[$key]['items'][] = $rowItem;
                }
            }

            // Helper to resolve or create MedicineVariant & ClinicMedicine
            $resolveClinicMedicine = function (array $itemWrapper) use ($user, $tenantId, &$createdMedicines) {
                $item = $itemWrapper['data'] ?? $itemWrapper;
                $matched = $itemWrapper['matched'] ?? null;
                $variantId = $matched['variant_id'] ?? null;
                $brandId = $matched['brand_id'] ?? null;

                if (! $variantId) {
                    $medicine = Medicine::firstOrCreate(
                        [
                            'normalized_name' => strtolower(trim((string) $item['generic_name'])),
                            'route' => 'Oral',
                        ],
                        [
                            'generic_name' => trim((string) $item['generic_name']),
                            'is_combination' => false,
                            'source' => Medicine::SOURCE_CLINIC,
                            'status' => Medicine::STATUS_PENDING,
                            'created_by_tenant_id' => $tenantId,
                            'created_by_user_id' => $user->id,
                        ]
                    );

                    $variant = MedicineVariant::firstOrCreate(
                        [
                            'medicine_id' => $medicine->id,
                            'strength_text' => trim((string) $item['strength']),
                            'dosage_form' => trim((string) $item['dosage_form']),
                            'form_detail' => null,
                        ],
                        [
                            'source' => Medicine::SOURCE_CLINIC,
                            'status' => MedicineVariant::STATUS_PENDING,
                            'created_by_tenant_id' => $tenantId,
                        ]
                    );
                    $variantId = $variant->id;

                    if (! empty($item['brand_name'])) {
                        $brand = MedicineBrand::firstOrCreate(
                            [
                                'medicine_variant_id' => $variantId,
                                'brand_name' => trim((string) $item['brand_name']),
                            ],
                            [
                                'manufacturer' => $item['manufacturer'] ?? null,
                                'status' => MedicineBrand::STATUS_PENDING,
                                'created_by_tenant_id' => $tenantId,
                            ]
                        );
                        $brandId = $brand->id;

                        if (! empty($item['barcode'])) {
                            MedicineBarcode::firstOrCreate(
                                [
                                    'barcode' => trim((string) $item['barcode']),
                                    'medicine_brand_id' => $brandId,
                                ],
                                [
                                    'pack_size' => 1,
                                    'status' => MedicineBarcode::STATUS_PENDING,
                                    'created_by_tenant_id' => $tenantId,
                                ]
                            );
                        }
                    }

                    $createdMedicines++;
                }

                $displayName = (! empty($item['brand_name']) ? "{$item['brand_name']} " : '')."{$item['generic_name']} {$item['strength']}";
                $sellingPrice = (int) ($item['selling_price_cents'] ?? 0);
                if ($sellingPrice <= 0) {
                    $sellingPrice = (int) round(((int) ($item['cost_price_cents'] ?? 0)) * 1.3);
                }

                $clinicMedicine = ClinicMedicine::firstOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'medicine_variant_id' => $variantId,
                        'medicine_brand_id' => $brandId,
                    ],
                    [
                        'display_name' => $displayName,
                        'base_unit' => $item['base_unit'] ?? 'tablet',
                        'selling_price_cents' => $sellingPrice,
                        'is_active' => true,
                    ]
                );

                if ($sellingPrice > 0 && $clinicMedicine->selling_price_cents !== $sellingPrice) {
                    $clinicMedicine->update(['selling_price_cents' => $sellingPrice]);
                }

                return $clinicMedicine;
            };

            // Process GRN groups
            foreach ($groupedByGrn as $grnGroup) {
                $supplier = Supplier::firstOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'name' => $grnGroup['supplier_name'],
                    ],
                    [
                        'is_active' => true,
                    ]
                );

                $grnItems = [];
                $grnTotalCents = 0;
                foreach ($grnGroup['items'] as $itemWrapper) {
                    $clinicMedicine = $resolveClinicMedicine($itemWrapper);
                    $item = $itemWrapper['data'] ?? $itemWrapper;
                    $qty = (int) $item['quantity'];
                    $costCents = (int) $item['cost_price_cents'];
                    $grnTotalCents += ($qty * $costCents);
                    $totalInventoryValueCents += ($qty * $costCents);

                    $grnItems[] = [
                        'clinic_medicine_id' => $clinicMedicine->id,
                        'display_name' => $clinicMedicine->display_name,
                        'base_unit' => $item['base_unit'] ?? 'tablet',
                        'batch_number' => $item['batch_number'] ?? 'N/A',
                        'expiry_date' => $item['expiry_date'] ?? null,
                        'quantity' => $qty,
                        'cost_price_cents' => $costCents,
                        'selling_price_cents' => (int) $item['selling_price_cents'],
                    ];
                }

                if (! empty($grnItems)) {
                    $receipt = $this->stockService->receiveStock([
                        'supplier_id' => $supplier->id,
                        'invoice_number' => $grnGroup['invoice_number'],
                        'received_date' => now()->toDateString(),
                        'notes' => 'Bulk imported from file'.($fileName ? " ({$fileName})" : ''),
                        'items' => $grnItems,
                    ], $user, $tenantId);

                    $createdReceipts++;
                    $createdBatches += count($grnItems);
                    $createdReceiptRecords[] = [
                        'id' => $receipt->id,
                        'receipt_number' => $receipt->receipt_number,
                        'supplier_name' => $supplier->name,
                        'invoice_number' => $grnGroup['invoice_number'],
                        'items_count' => count($grnItems),
                        'total_cost_cents' => $grnTotalCents,
                    ];
                }
            }

            // Process Opening Stock rows
            foreach ($openingStockItems as $itemWrapper) {
                $clinicMedicine = $resolveClinicMedicine($itemWrapper);
                $item = $itemWrapper['data'] ?? $itemWrapper;
                $qty = (int) $item['quantity'];
                $costCents = (int) $item['cost_price_cents'];
                $totalInventoryValueCents += ($qty * $costCents);

                $this->stockService->recordOpeningStock($clinicMedicine, [
                    [
                        'batch_number' => $item['batch_number'] ?? 'N/A',
                        'expiry_date' => $item['expiry_date'],
                        'quantity' => $qty,
                        'cost_price_cents' => $costCents,
                    ],
                ], $user, $tenantId);

                $createdBatches++;
                $openingStockCount++;
            }

            // Record audit event for re-import protection and import history
            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'action' => 'stock.imported',
                'resource_type' => 'StockImport',
                'resource_id' => (string) $createdReceipts,
                'metadata' => [
                    'file_hash' => $fileHash,
                    'file_name' => $fileName,
                    'total_rows' => count($rows),
                    'created_medicines' => $createdMedicines,
                    'created_batches' => $createdBatches,
                    'created_receipts' => $createdReceipts,
                    'opening_stock_batches' => $openingStockCount,
                    'total_value_cents' => $totalInventoryValueCents,
                    'receipts' => $createdReceiptRecords,
                ],
                'created_at' => now(),
            ]);

            return [
                'success' => true,
                'total_imported' => count($rows),
                'created_medicines' => $createdMedicines,
                'created_receipts' => $createdReceipts,
                'created_batches' => $createdBatches,
                'opening_stock_batches' => $openingStockCount,
                'total_value_cents' => $totalInventoryValueCents,
                'receipt_records' => $createdReceiptRecords,
            ];
        });
    }
}

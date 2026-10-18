<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

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
     * Expected CSV headers.
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
     * Generate sample CSV template content with 2 batches of the same medicine.
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
     * Generate sample Excel (.xlsx) template content with 2 batches of the same medicine.
     */
    public function generateTemplateXlsx(): string
    {
        $rows = $this->getTemplateSampleRows();
        $tempFile = tempnam(sys_get_temp_dir(), 'xlsx_');

        $zip = new \ZipArchive;
        $zip->open($tempFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>';

        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>';

        $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>';

        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Stock Template" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>';

        $sheetXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n";
        $sheetXml .= "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n";
        $sheetXml .= "<sheetData>\n";

        foreach ($rows as $rIdx => $row) {
            $rowNum = $rIdx + 1;
            $sheetXml .= '<row r="'.$rowNum.'">'."\n";
            foreach ($row as $cIdx => $val) {
                $colLetter = chr(65 + $cIdx);
                $cellRef = $colLetter.$rowNum;
                $escaped = htmlspecialchars((string) $val, ENT_XML1, 'UTF-8');
                $sheetXml .= '<c r="'.$cellRef.'" t="inlineStr"><is><t>'.$escaped."</t></is></c>\n";
            }
            $sheetXml .= "</row>\n";
        }

        $sheetXml .= '</sheetData></worksheet>';

        $zip->addFromString('[Content_Types].xml', $contentTypes);
        $zip->addFromString('_rels/.rels', $rels);
        $zip->addFromString('xl/_rels/workbook.xml.rels', $wbRels);
        $zip->addFromString('xl/workbook.xml', $workbook);
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);
        $zip->close();

        $content = (string) file_get_contents($tempFile);
        @unlink($tempFile);

        return $content;
    }

    /**
     * Standard rows for template (headers + 2 rows of same medicine with different batches).
     *
     * @return array<array<string>>
     */
    public function getTemplateSampleRows(): array
    {
        return [
            self::HEADERS,
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
     * Parse and preview uploaded CSV or XLSX file with auto-matching.
     *
     * @return array{
     *     total_rows: int,
     *     valid_count: int,
     *     error_count: int,
     *     preview: array<mixed>
     * }
     */
    public function parseAndPreview(UploadedFile $file, string $tenantId): array
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

        // Normalize header row
        $normalizedHeader = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $headerMap = array_flip($normalizedHeader);

        $previewRows = [];
        $rowCount = 0;
        $maxRows = 2000;
        $validCount = 0;
        $errorCount = 0;

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
                $colIdx = $headerMap[$field] ?? null;
                $rowData[$field] = $colIdx !== null && isset($row[$colIdx]) ? trim((string) $row[$colIdx]) : '';
            }

            $parsedRow = $this->matchAndValidateRow($rowData, $tenantId, $rowCount);
            if ($parsedRow['status'] === 'error') {
                $errorCount++;
            } else {
                $validCount++;
            }

            $previewRows[] = $parsedRow;
        }

        return [
            'total_rows' => count($previewRows),
            'valid_count' => $validCount,
            'error_count' => $errorCount,
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
     * @return array<string, mixed>
     */
    protected function matchAndValidateRow(array $row, string $tenantId, int $rowNumber): array
    {
        $errors = [];

        // Required fields
        if ($row['generic_name'] === '') {
            $errors[] = 'Generic name is required';
        }
        if ($row['strength'] === '') {
            $errors[] = 'Strength is required';
        }
        $qty = (int) $row['quantity'];
        if ($qty <= 0) {
            $errors[] = 'Quantity must be greater than zero';
        }

        // Batch number required (allow N/A)
        if (trim($row['batch_number']) === '') {
            $errors[] = 'Batch number is required (use "N/A" if none)';
        }

        // Parse and validate Expiry Date (must be in future)
        $expiryDate = null;
        if (trim($row['expiry_date']) === '') {
            $errors[] = 'Expiry date is required';
        } else {
            $rawExpiry = trim($row['expiry_date']);
            try {
                if (is_numeric($rawExpiry) && (int) $rawExpiry > 20000 && (int) $rawExpiry < 80000) {
                    // Excel serial date integer
                    $expiryDate = Carbon::create(1899, 12, 30)->addDays((int) $rawExpiry)->toDateString();
                } elseif (str_contains($rawExpiry, '/')) {
                    $expiryDate = Carbon::createFromFormat('d/m/Y', $rawExpiry)->toDateString();
                } elseif (str_contains($rawExpiry, '.')) {
                    $expiryDate = Carbon::createFromFormat('d.m.Y', $rawExpiry)->toDateString();
                } else {
                    $expiryDate = Carbon::parse($rawExpiry)->toDateString();
                }

                if ($expiryDate <= now()->toDateString()) {
                    $errors[] = 'Expiry date must be in the future (already-expired stock is rejected)';
                }
            } catch (\Throwable) {
                $errors[] = 'Invalid expiry date format (use YYYY-MM-DD, DD/MM/YYYY, or DD.MM.YYYY)';
            }
        }

        // Prices in Rupees -> will be cents
        $costPriceRupees = (float) ($row['cost_price'] ?: 0);
        $sellingPriceRupees = (float) ($row['selling_price'] ?: 0);

        if ($costPriceRupees < 0 || $sellingPriceRupees < 0) {
            $errors[] = 'Prices cannot be negative';
        }

        $dosageForm = ! empty($row['dosage_form']) ? ucfirst(strtolower($row['dosage_form'])) : 'Tablet';
        $brandName = $row['brand_name'] ?: null;
        $barcode = $row['barcode'] ?: null;

        // Matching strategy
        $matchType = 'none';
        $matchedVariant = null;
        $matchedBrand = null;

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
                    $vq->whereRaw('LOWER(strength_text) = ?', [strtolower($row['strength'])]);
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
        if (! $matchedVariant && $row['generic_name'] !== '') {
            $variantRecord = MedicineVariant::with('medicine')
                ->whereRaw('LOWER(strength_text) = ?', [strtolower($row['strength'])])
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

        $status = ! empty($errors) ? 'error' : ($matchedVariant ? 'matched' : 'new_medicine');

        return [
            'row_index' => $rowNumber,
            'status' => $status,
            'match_type' => $matchType,
            'errors' => $errors,
            'data' => [
                'barcode' => $barcode,
                'generic_name' => $row['generic_name'],
                'strength' => $row['strength'],
                'dosage_form' => $dosageForm,
                'brand_name' => $brandName,
                'manufacturer' => $row['manufacturer'] ?: null,
                'batch_number' => $row['batch_number'] ?: 'N/A',
                'expiry_date' => $expiryDate,
                'quantity' => $qty,
                'base_unit' => strtolower($row['base_unit'] ?: 'tablet'),
                'cost_price_cents' => (int) round($costPriceRupees * 100),
                'selling_price_cents' => (int) round($sellingPriceRupees * 100),
                'supplier_name' => $row['supplier_name'] ?: null,
                'invoice_number' => $row['invoice_number'] ?: null,
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
    public function executeImport(array $rows, User $user, string $tenantId): array
    {
        return DB::transaction(function () use ($rows, $user, $tenantId) {
            $createdMedicines = 0;
            $createdBatches = 0;
            $createdReceipts = 0;

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
                foreach ($grnGroup['items'] as $itemWrapper) {
                    $clinicMedicine = $resolveClinicMedicine($itemWrapper);
                    $item = $itemWrapper['data'] ?? $itemWrapper;

                    $grnItems[] = [
                        'clinic_medicine_id' => $clinicMedicine->id,
                        'display_name' => $clinicMedicine->display_name,
                        'base_unit' => $item['base_unit'] ?? 'tablet',
                        'batch_number' => $item['batch_number'] ?? 'N/A',
                        'expiry_date' => $item['expiry_date'] ?? null,
                        'quantity' => (int) $item['quantity'],
                        'cost_price_cents' => (int) $item['cost_price_cents'],
                        'selling_price_cents' => (int) $item['selling_price_cents'],
                    ];
                }

                if (! empty($grnItems)) {
                    $this->stockService->receiveStock([
                        'supplier_id' => $supplier->id,
                        'invoice_number' => $grnGroup['invoice_number'],
                        'received_date' => now()->toDateString(),
                        'notes' => 'Bulk imported from file',
                        'items' => $grnItems,
                    ], $user, $tenantId);

                    $createdReceipts++;
                    $createdBatches += count($grnItems);
                }
            }

            // Process Opening Stock rows
            foreach ($openingStockItems as $itemWrapper) {
                $clinicMedicine = $resolveClinicMedicine($itemWrapper);
                $item = $itemWrapper['data'] ?? $itemWrapper;

                $this->stockService->recordOpeningStock($clinicMedicine, [
                    [
                        'batch_number' => $item['batch_number'] ?? 'N/A',
                        'expiry_date' => $item['expiry_date'],
                        'quantity' => (int) $item['quantity'],
                        'cost_price_cents' => (int) $item['cost_price_cents'],
                    ],
                ], $user, $tenantId);

                $createdBatches++;
            }

            return [
                'success' => true,
                'created_medicines' => $createdMedicines,
                'created_receipts' => $createdReceipts,
                'created_batches' => $createdBatches,
            ];
        });
    }
}

<style>
@php
    $sinhalaBase64 = \App\Services\Pdf\ChromiumPdfService::getFontBase64('NotoSansSinhala.ttf');
    $tamilBase64 = \App\Services\Pdf\ChromiumPdfService::getFontBase64('NotoSansTamil.ttf');
    $poppinsRegBase64 = \App\Services\Pdf\ChromiumPdfService::getFontBase64('Poppins-Regular.ttf');
    $poppinsBoldBase64 = \App\Services\Pdf\ChromiumPdfService::getFontBase64('Poppins-Bold.ttf');
@endphp

@font-face {
    font-family: 'Noto Sans Sinhala';
    src: url('data:font/ttf;base64,{{ $sinhalaBase64 }}') format('truetype');
    font-weight: 100 900;
    font-style: normal;
}

@font-face {
    font-family: 'Noto Sans Tamil';
    src: url('data:font/ttf;base64,{{ $tamilBase64 }}') format('truetype');
    font-weight: 100 900;
    font-style: normal;
}

@font-face {
    font-family: 'Poppins';
    src: url('data:font/ttf;base64,{{ $poppinsRegBase64 }}') format('truetype');
    font-weight: 400;
    font-style: normal;
}

@font-face {
    font-family: 'Poppins';
    src: url('data:font/ttf;base64,{{ $poppinsBoldBase64 }}') format('truetype');
    font-weight: 700;
    font-style: normal;
}

* {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

body {
    font-family: 'Poppins', 'Noto Sans Sinhala', 'Noto Sans Tamil', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 0;
    line-height: 1.5;
}
</style>

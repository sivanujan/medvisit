<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>{{ $subject ?? 'MedVisit Notification' }}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <style type="text/css">
        body, table, td, a, span, p, h1, h2, h3 { font-family: -apple-system, 'Segoe UI', Arial, sans-serif !important; }
    </style>
    <![endif]-->
    <style type="text/css">
        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }
        body, table, td, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            border-collapse: collapse;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #F4F7FB;
            font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            -webkit-font-smoothing: antialiased;
        }
        a {
            color: #1E6FD9;
            text-decoration: none;
        }
        .content-card {
            background-color: #FFFFFF;
            border-radius: 12px;
            border: 1px solid #E3E8EF;
            padding: 32px;
        }
        @media only screen and (max-width: 620px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            .content-card {
                padding: 24px 20px !important;
                border-radius: 10px !important;
            }
            .mobile-full-width {
                width: 100% !important;
                display: block !important;
            }
            .mobile-center {
                text-align: center !important;
            }
        }
        @media (prefers-color-scheme: dark) {
            body, .bg-body {
                background-color: #0F172A !important;
            }
            .content-card {
                background-color: #1E293B !important;
                border-color: #334155 !important;
            }
            h1, h2, h3, h4, .text-main, strong {
                color: #F8FAFC !important;
            }
            p, .text-body {
                color: #CBD5E1 !important;
            }
            .text-muted {
                color: #94A3B8 !important;
            }
            .info-box, .clinic-box {
                background-color: #0F172A !important;
                border-color: #334155 !important;
            }
            .info-box td, .clinic-box td, .clinic-box div {
                color: #E2E8F0 !important;
                border-color: #334155 !important;
            }
            .footer-text {
                color: #94A3B8 !important;
            }
        }
    </style>
</head>
<body class="bg-body" style="margin: 0; padding: 0; background-color: #F4F7FB; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    {{-- Hidden Preheader text (~90 chars) + spacer hack --}}
    @if (!empty($preheader))
        <div style="display: none; font-size: 1px; color: #F4F7FB; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
            {{ $preheader }}
            &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
        </div>
    @endif

    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" class="bg-body" style="background-color: #F4F7FB; width: 100%;">
        <tr>
            <td align="center" style="padding: 24px 12px 40px 12px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto;">
                    {{-- Header with Brand Logo / Clinic Brand --}}
                    <tr>
                        <td style="padding: 0 0 20px 0;">
                            @include('emails.components.header', [
                                'brandMode' => $brandMode ?? 'platform',
                                'clinicName' => $clinicName ?? null,
                                'clinicLogo' => $clinicLogo ?? null,
                                'clinicAddress' => $clinicAddress ?? null,
                                'clinicPhone' => $clinicPhone ?? null,
                            ])
                        </td>
                    </tr>

                    {{-- 3px Brand Gradient Line Header --}}
                    <tr>
                        <td style="height: 3px; font-size: 3px; line-height: 3px; border-top-left-radius: 12px; border-top-right-radius: 12px; background: #1E6FD9; background: linear-gradient(90deg, #1E6FD9 0%, #0E9E8F 100%);">
                            <!--[if mso]>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="3" bgcolor="#1E6FD9" style="font-size:3px;line-height:3px;">&nbsp;</td></tr></table>
                            <![endif]-->
                        </td>
                    </tr>

                    {{-- Main Content Card --}}
                    <tr>
                        <td class="content-card" style="background-color: #FFFFFF; border: 1px solid #E3E8EF; border-top: none; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);">
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Shared Footer --}}
                    <tr>
                        <td style="padding: 24px 8px 0 8px;">
                            @include('emails.components.footer', [
                                'brandMode' => $brandMode ?? 'platform',
                                'clinicName' => $clinicName ?? null,
                                'clinicAddress' => $clinicAddress ?? null,
                                'clinicPhone' => $clinicPhone ?? null,
                                'showUnsubscribe' => $showUnsubscribe ?? false,
                                'unsubscribeUrl' => $unsubscribeUrl ?? null,
                            ])
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

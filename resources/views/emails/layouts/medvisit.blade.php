<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ $subject ?? 'MedVisit' }}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, a, span { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
    <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        
        body, table, td, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
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
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
        }
        a {
            color: #1E6FD9;
            text-decoration: none;
        }
        .btn-primary:hover {
            background-color: #1558B0 !important;
        }
        @media screen and (max-width: 600px) {
            .wrapper {
                width: 100% !important;
                padding: 12px !important;
            }
            .content-card {
                padding: 24px 20px !important;
                border-radius: 12px !important;
            }
            .responsive-btn {
                display: block !important;
                width: 100% !important;
                box-sizing: border-box !important;
                text-align: center !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7FB; -webkit-font-smoothing: antialiased;">
    @if(!empty($previewText))
        <div style="display: none; font-size: 1px; color: #F4F7FB; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
            {{ $previewText }}
        </div>
    @endif

    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #F4F7FB; min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapper" style="max-width: 580px;">
                    <!-- Brand Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 24px;">
                            <a href="{{ config('app.url') }}" target="_blank" style="display: inline-block;">
                                <img src="{{ rtrim(config('app.url'), '/') }}/images/medvisit-logo.png" 
                                     alt="MedVisit" 
                                     width="160" 
                                     style="display: block; width: 160px; max-width: 160px; height: auto;" />
                            </a>
                        </td>
                    </tr>

                    <!-- Main Content Card -->
                    <tr>
                        <td class="content-card" style="background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
                            @yield('content')
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 28px; padding-bottom: 20px; font-size: 13px; color: #64748B; line-height: 20px; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
                                MedVisit &bull; Healthcare Platform, Sri Lanka
                            </p>
                            <p style="margin: 0 0 10px 0;">
                                Questions or support needed? Contact <a href="mailto:{{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}" style="color: #1E6FD9; text-decoration: underline; font-weight: 500;">{{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                                {{ $reason ?? 'You received this email in connection with your MedVisit account or clinic operations.' }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

# Complete MedVisit Feature & Route Inventory

Generated on 2026-10-25 09:40:16 (Asia/Colombo)

## Summary by Category

| Category | Total Items |
|---|---|
| Central / Public Routes | 55 |
| Tenant App Routes | 254 |
| Super Admin Routes | 93 |
| API Routes | 15 |
| Webhooks | 3 |

### Central Routes (55)

| Method | URI | Name | Action / Controller | Status |
|---|---|---|---|---|
| `GET|HEAD` | `/` | `home` | `Closure` | ✅ Covered by existing test |
| `GET|HEAD` | `announcements/cta/{recipient}` | `announcements.cta` | `ClinicAnnouncementController@trackCtaClick` | 🔍 Covered by this QA pass |
| `POST` | `check-subdomain` | `subdomain.check` | `ClinicRegistrationController@checkSubdomain` | ✅ Covered by existing test |
| `GET|HEAD` | `clinics/{slug}` | `public.directory.clinic` | `PublicDirectoryController@showClinic` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `confirm-password` | `password.confirm` | `ConfirmablePasswordController@show` | ✅ Covered by existing test |
| `POST` | `confirm-password` | `` | `ConfirmablePasswordController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `dashboard` | `dashboard` | `Closure` | ✅ Covered by existing test |
| `GET|HEAD` | `dev/components` | `dev.components` | `Closure` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `dev/preview/dashboard` | `dev.preview.dashboard` | `Closure` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `dev/preview/register-success` | `dev.preview.register-success` | `Closure` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `dev/preview/subscribe` | `dev.preview.subscribe` | `Closure` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `dispute-policy` | `dispute_policy` | `PublicLegalController@disputePolicy` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `doctor` | `doctor.index` | `Closure` | ✅ Covered by existing test |
| `GET|HEAD` | `doctors/{clinicSlug}/{doctorSlug}` | `public.directory.doctor` | `PublicDirectoryController@showDoctor` | 🔍 Covered by this QA pass |
| `POST` | `email/verification-notification` | `verification.send` | `EmailVerificationNotificationController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `find` | `public.directory.index` | `PublicDirectoryController@index` | ✅ Covered by existing test |
| `POST` | `find-clinic/email` | `find.clinic.email` | `FindClinicController@searchEmail` | ✅ Covered by existing test |
| `POST` | `find-clinic/subdomain` | `find.clinic.subdomain` | `FindClinicController@searchSubdomain` | ✅ Covered by existing test |
| `GET|HEAD` | `forgot-password` | `password.request` | `PasswordResetLinkController@create` | ✅ Covered by existing test |
| `POST` | `forgot-password` | `password.email` | `PasswordResetLinkController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `login` | `login` | `AuthenticatedSessionController@create` | ✅ Covered by existing test |
| `POST` | `login` | `` | `AuthenticatedSessionController@store` | ✅ Covered by existing test |
| `POST` | `logout` | `logout` | `AuthenticatedSessionController@destroy` | ✅ Covered by existing test |
| `PUT` | `password` | `password.update` | `PasswordController@update` | ✅ Covered by existing test |
| `GET|HEAD` | `pricing` | `pricing` | `PublicLegalController@pricing` | ✅ Covered by existing test |
| `GET|HEAD` | `privacy-policy` | `privacy_policy` | `PublicLegalController@privacyPolicy` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `profile` | `profile.edit` | `ProfileController@edit` | ✅ Covered by existing test |
| `PATCH` | `profile` | `profile.update` | `ProfileController@update` | ✅ Covered by existing test |
| `DELETE` | `profile` | `profile.destroy` | `ProfileController@destroy` | ✅ Covered by existing test |
| `POST` | `profile/avatar` | `profile.avatar.upload` | `ProfileController@uploadAvatar` | 🔍 Covered by this QA pass |
| `DELETE` | `profile/avatar` | `profile.avatar.delete` | `ProfileController@deleteAvatar` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `reception` | `reception.index` | `Closure` | ✅ Covered by existing test |
| `GET|HEAD` | `refund-policy` | `refund_policy` | `PublicLegalController@refundPolicy` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `register` | `register` | `ClinicRegistrationController@create` | ✅ Covered by existing test |
| `POST` | `register` | `` | `ClinicRegistrationController@store` | ✅ Covered by existing test |
| `POST` | `register/resend-code` | `register.resend_code` | `ClinicRegistrationController@resendCode` | ✅ Covered by existing test |
| `POST` | `register/send-code` | `register.send_code` | `ClinicRegistrationController@sendVerificationCode` | ✅ Covered by existing test |
| `GET|HEAD` | `register/success` | `register.success` | `ClinicRegistrationController@success` | ✅ Covered by existing test |
| `POST` | `register/verify-code` | `register.verify_code` | `ClinicRegistrationController@verifyCode` | ✅ Covered by existing test |
| `POST` | `reset-password` | `password.store` | `NewPasswordController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `reset-password/{token}` | `password.reset` | `NewPasswordController@create` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `sitemap.xml` | `public.directory.sitemap` | `PublicDirectoryController@sitemap` | 🔍 Covered by this QA pass |
| `POST` | `support/broadcasting/auth` | `support.broadcasting.auth` | `SupportBroadcastAuthController@authenticate` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations` | `support.conversations.store` | `SupportChatWidgetController@store` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `support/conversations/{publicId}` | `support.conversations.show` | `SupportChatWidgetController@show` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/close` | `support.conversations.close` | `SupportChatWidgetController@close` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/messages` | `support.conversations.messages.send` | `SupportChatWidgetController@sendMessage` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/read` | `support.conversations.read` | `SupportChatWidgetController@markRead` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/typing` | `support.conversations.typing` | `SupportChatWidgetController@typing` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `support/status` | `support.status` | `SupportChatWidgetController@status` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `terms` | `terms` | `PublicLegalController@terms` | ✅ Covered by existing test |
| `GET|HEAD` | `two-factor-challenge` | `two-factor.challenge` | `TwoFactorChallengeController@create` | 🔍 Covered by this QA pass |
| `POST` | `two-factor-challenge` | `two-factor.challenge.store` | `TwoFactorChallengeController@store` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `verify-email` | `verification.notice` | `EmailVerificationPromptController` | ✅ Covered by existing test |
| `GET|HEAD` | `verify-email/{id}/{hash}` | `verification.verify` | `VerifyEmailController` | ✅ Covered by existing test |

### Tenant Routes (254)

| Method | URI | Name | Action / Controller | Status |
|---|---|---|---|---|
| `GET|HEAD` | `/` | `tenant.home` | `ClinicWebsiteController@publicHome` | ✅ Covered by existing test |
| `GET|HEAD` | `billing` | `tenant.billing` | `BillingController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `billing/export` | `tenant.billing.export` | `BillingController@export` | ✅ Covered by existing test |
| `GET|HEAD` | `billing/inactive` | `tenant.billing.inactive` | `Closure` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `billing/payouts` | `tenant.settlements` | `DoctorSettlementController@index` | ✅ Covered by existing test |
| `POST` | `billing/payouts` | `tenant.settlements.store` | `DoctorSettlementController@store` | ✅ Covered by existing test |
| `POST` | `billing/payouts/disburse` | `tenant.settlements.disburse` | `DoctorSettlementController@disburse` | ✅ Covered by existing test |
| `GET|HEAD` | `billing/payouts/export` | `tenant.settlements.export` | `DoctorSettlementController@export` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `billing/payouts/session-bills/{session}` | `tenant.settlements.session_bills` | `DoctorSettlementController@sessionBills` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `billing/payouts/slip/{settlement}` | `tenant.settlements.slip` | `DoctorSettlementController@slip` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `billing/payouts/unsettled-bills/{doctor}` | `tenant.settlements.unsettled_bills` | `DoctorSettlementController@unsettledBills` | 🔍 Covered by this QA pass |
| `POST` | `billing/payouts/{settlement}/pay` | `tenant.settlements.pay` | `DoctorSettlementController@recordPayment` | 🔍 Covered by this QA pass |
| `POST` | `billing/payouts/{settlement}/void` | `tenant.settlements.void` | `DoctorSettlementController@void` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `billing/subscribe` | `tenant.billing.subscribe` | `Closure` | 🔍 Covered by this QA pass |
| `POST` | `billing/{bill}/pay` | `tenant.billing.pay` | `BillingController@pay` | 🔍 Covered by this QA pass |
| `POST` | `billing/{bill}/refund` | `tenant.billing.refund` | `BillingController@refund` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book` | `tenant.book` | `PublicBookingController@index` | ✅ Covered by existing test |
| `POST` | `book` | `tenant.book.store` | `PublicBookingController@store` | ✅ Covered by existing test |
| `POST` | `book/cancel/{signedToken}` | `tenant.book.cancel` | `PublicBookingController@cancel` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book/confirmed/{signedToken}` | `tenant.book.confirmed` | `PublicBookingController@confirmed` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book/ics/{signedToken}` | `tenant.book.ics` | `PublicBookingController@downloadIcs` | 🔍 Covered by this QA pass |
| `POST` | `book/verify/check-code` | `tenant.book.verify.check_code` | `PublicBookingController@verifyPhoneCode` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book/verify/check-remembered` | `tenant.book.verify.check_remembered` | `PublicBookingController@checkRememberedPhone` | 🔍 Covered by this QA pass |
| `POST` | `book/verify/start` | `tenant.book.verify.start` | `PublicBookingController@startPhoneVerification` | ✅ Covered by existing test |
| `GET|HEAD` | `book/verify/status` | `tenant.book.verify.status` | `PublicBookingController@checkPhoneVerificationStatus` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book/{slug}` | `tenant.book.doctor` | `PublicBookingController@showDoctor` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book/{slug}/{session}` | `tenant.book.session` | `PublicBookingController@showSession` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `bookings` | `tenant.bookings` | `BookingTokenController@index` | ✅ Covered by existing test |
| `POST` | `bookings` | `tenant.bookings.store` | `BookingTokenController@store` | ✅ Covered by existing test |
| `POST` | `bookings/{token}/cancel` | `tenant.bookings.cancel` | `BookingTokenController@cancel` | 🔍 Covered by this QA pass |
| `POST` | `bookings/{token}/move` | `tenant.bookings.move` | `BookingTokenController@move` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `calendar` | `tenant.calendar` | `ChannelingCalendarController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `calendar/roster/{session}` | `tenant.calendar.roster` | `ChannelingCalendarController@roster` | 🔍 Covered by this QA pass |
| `POST` | `calendar/sessions/{session}/cancel` | `tenant.calendar.sessions.cancel` | `ChannelingCalendarController@cancelSession` | 🔍 Covered by this QA pass |
| `POST` | `calendar/sessions/{session}/duplicate` | `tenant.calendar.sessions.duplicate` | `ChannelingCalendarController@duplicateSession` | 🔍 Covered by this QA pass |
| `POST` | `calendar/sessions/{session}/reschedule` | `tenant.calendar.sessions.reschedule` | `ChannelingCalendarController@rescheduleSession` | 🔍 Covered by this QA pass |
| `POST` | `calendar/sessions/{session}/update` | `tenant.calendar.sessions.update` | `ChannelingCalendarController@updateSession` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `clinic/suspended` | `tenant.suspended` | `TenantSuspendedController@show` | ✅ Covered by existing test |
| `GET|HEAD` | `dashboard` | `tenant.dashboard` | `TenantDashboardController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `doctor` | `tenant.doctor.index` | `Closure` | ✅ Covered by existing test |
| `GET|HEAD` | `doctor/consultation/{token}` | `tenant.doctor.consultation` | `ConsultationController@show` | 🔍 Covered by this QA pass |
| `POST` | `doctor/consultation/{token}/addendum` | `tenant.doctor.consultation.addendum` | `ConsultationController@addendum` | 🔍 Covered by this QA pass |
| `POST` | `doctor/consultation/{token}/cancel` | `tenant.doctor.consultation.cancel` | `ConsultationController@cancel` | 🔍 Covered by this QA pass |
| `POST` | `doctor/consultation/{token}/draft` | `tenant.doctor.consultation.draft` | `ConsultationController@saveDraft` | 🔍 Covered by this QA pass |
| `POST` | `doctor/consultation/{token}/finalize` | `tenant.doctor.consultation.finalize` | `ConsultationController@finalize` | 🔍 Covered by this QA pass |
| `POST` | `doctor/consultation/{token}/repeat-last` | `tenant.doctor.consultation.repeat_last` | `ConsultationController@repeatLast` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `doctor/patients/{patient}/history` | `tenant.doctor.patients.history` | `ConsultationController@patientHistory` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `doctor/prescriptions/{prescription}/print` | `tenant.doctor.prescriptions.print` | `ConsultationController@print` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `doctor/templates` | `tenant.doctor.templates` | `PrescriptionTemplateController@index` | ✅ Covered by existing test |
| `POST` | `doctor/templates` | `tenant.doctor.templates.store` | `PrescriptionTemplateController@store` | ✅ Covered by existing test |
| `PUT` | `doctor/templates/{template}` | `tenant.doctor.templates.update` | `PrescriptionTemplateController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `doctor/templates/{template}` | `tenant.doctor.templates.destroy` | `PrescriptionTemplateController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `doctor/templates/{template}/apply` | `tenant.doctor.templates.apply` | `PrescriptionTemplateController@recordUsage` | 🔍 Covered by this QA pass |
| `POST` | `doctor/templates/{template}/duplicate` | `tenant.doctor.templates.duplicate` | `PrescriptionTemplateController@duplicate` | 🔍 Covered by this QA pass |
| `POST` | `doctor/templates/{template}/toggle-share` | `tenant.doctor.templates.toggle_share` | `PrescriptionTemplateController@toggleShare` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `doctors` | `tenant.doctors` | `DoctorController@index` | ✅ Covered by existing test |
| `POST` | `doctors` | `tenant.doctors.store` | `DoctorController@store` | ✅ Covered by existing test |
| `POST` | `doctors/generate-sessions` | `tenant.doctors.generate_sessions` | `DoctorController@generateSessions` | ✅ Covered by existing test |
| `POST` | `doctors/generate-sessions/preview` | `tenant.doctors.generate_sessions.preview` | `DoctorController@previewGenerateSessions` | 🔍 Covered by this QA pass |
| `POST` | `doctors/leaves` | `tenant.doctors.leaves.store` | `DoctorController@storeLeave` | 🔍 Covered by this QA pass |
| `POST` | `doctors/leaves/preview` | `tenant.doctors.leaves.preview` | `DoctorController@previewLeaveImpact` | 🔍 Covered by this QA pass |
| `DELETE` | `doctors/leaves/{leave}` | `tenant.doctors.leaves.destroy` | `DoctorController@destroyLeave` | 🔍 Covered by this QA pass |
| `POST` | `doctors/sessions/one-off` | `tenant.doctors.sessions.one_off` | `DoctorController@storeOneOffSession` | ✅ Covered by existing test |
| `POST` | `doctors/templates` | `tenant.doctors.templates.store` | `DoctorController@storeTemplate` | ✅ Covered by existing test |
| `PUT` | `doctors/templates/{template}` | `tenant.doctors.templates.update` | `DoctorController@updateTemplate` | 🔍 Covered by this QA pass |
| `DELETE` | `doctors/templates/{template}` | `tenant.doctors.templates.destroy` | `DoctorController@destroyTemplate` | 🔍 Covered by this QA pass |
| `POST` | `doctors/templates/{template}/duplicate` | `tenant.doctors.templates.duplicate` | `DoctorController@duplicateTemplate` | 🔍 Covered by this QA pass |
| `PUT` | `doctors/{doctor}` | `tenant.doctors.update` | `DoctorController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `doctors/{doctor}` | `tenant.doctors.destroy` | `DoctorController@destroy` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `doctors/{doctor}/available-sessions` | `tenant.doctors.available_sessions` | `BookingTokenController@availableSessions` | 🔍 Covered by this QA pass |
| `POST` | `doctors/{doctor}/photo` | `tenant.doctors.photo.upload` | `DoctorController@uploadPhoto` | 🔍 Covered by this QA pass |
| `DELETE` | `doctors/{doctor}/photo` | `tenant.doctors.photo.delete` | `DoctorController@deletePhoto` | 🔍 Covered by this QA pass |
| `PATCH` | `doctors/{doctor}/toggle` | `tenant.doctors.toggle` | `DoctorController@toggleActive` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `forgot-password` | `tenant.password.request` | `TenantPasswordResetLinkController@create` | ✅ Covered by existing test |
| `POST` | `forgot-password` | `tenant.password.email` | `TenantPasswordResetLinkController@store` | ✅ Covered by existing test |
| `GET|POST|HEAD` | `impersonate/exit` | `tenant.impersonate.exit` | `TenantImpersonationController@exit` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `impersonate/{token}` | `tenant.impersonate` | `TenantImpersonationController@enter` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `invitation/accept/{token}` | `tenant.invitation.accept` | `StaffController@showAcceptInvite` | 🔍 Covered by this QA pass |
| `POST` | `invitation/accept/{token}` | `tenant.invitation.store` | `StaffController@acceptInvite` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `login` | `tenant.login` | `TenantAuthenticatedSessionController@create` | ✅ Covered by existing test |
| `POST` | `login` | `` | `TenantAuthenticatedSessionController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `login/one-time` | `tenant.login.one_time` | `TenantSignedLoginController@login` | ✅ Covered by existing test |
| `POST` | `logout` | `tenant.logout` | `TenantAuthenticatedSessionController@destroy` | ✅ Covered by existing test |
| `GET|HEAD` | `p/{slug}` | `tenant.page` | `ClinicWebsiteController@publicPage` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `patients` | `tenant.patients` | `PatientController@index` | ✅ Covered by existing test |
| `POST` | `patients` | `tenant.patients.store` | `PatientController@store` | ✅ Covered by existing test |
| `PUT` | `patients/{patient}` | `tenant.patients.update` | `PatientController@update` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `patients/{patient}/history` | `tenant.patients.history` | `PatientController@history` | 🔍 Covered by this QA pass |
| `POST` | `patients/{patient}/reveal-nic` | `tenant.patients.reveal_nic` | `PatientController@revealNic` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/barcodes/link` | `tenant.pharmacy.barcodes.link` | `StockReceiptController@linkBarcode` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/barcodes/{code}` | `tenant.pharmacy.barcodes.lookup` | `StockReceiptController@lookupBarcode` | 🔍 Covered by this QA pass |
| `PUT` | `pharmacy/batches/{batch}` | `tenant.pharmacy.batches.update` | `StockController@updateBatch` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/batches/{batch}/void` | `tenant.pharmacy.batches.void` | `StockController@voidBatch` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/catalog/search` | `tenant.pharmacy.catalog.search` | `StockController@searchCatalog` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/dispense` | `tenant.pharmacy.dispense` | `DispenseController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/dispense/history` | `tenant.pharmacy.dispense.history` | `DispenseController@history` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/dispense/{prescription}` | `tenant.pharmacy.dispense.show` | `DispenseController@show` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/dispense/{prescription}/confirm` | `tenant.pharmacy.dispense.confirm` | `DispenseController@confirm` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/dispense/{prescription}/hold` | `tenant.pharmacy.dispense.hold` | `DispenseController@hold` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/dispense/{prescription}/lock` | `tenant.pharmacy.dispense.lock` | `DispenseController@lock` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/dispense/{prescription}/undo` | `tenant.pharmacy.dispense.undo` | `DispenseController@undo` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/dispense/{prescription}/unlock` | `tenant.pharmacy.dispense.unlock` | `DispenseController@unlock` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/import` | `tenant.pharmacy.import` | `StockImportController@index` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/import/confirm` | `tenant.pharmacy.import.confirm` | `StockImportController@confirm` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/import/history` | `tenant.pharmacy.import.history` | `StockImportController@history` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/import/preview` | `tenant.pharmacy.import.preview` | `StockImportController@preview` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/import/template` | `tenant.pharmacy.import.template` | `StockImportController@downloadTemplate` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/medicines` | `tenant.pharmacy.medicines` | `StockController@index` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/medicines` | `tenant.pharmacy.medicines.store` | `StockController@store` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/medicines-export` | `tenant.pharmacy.medicines.export` | `StockController@export` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/medicines/dismiss-duplicate` | `tenant.pharmacy.medicines.dismiss_duplicate` | `StockController@dismissDuplicate` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/medicines/merge` | `tenant.pharmacy.medicines.merge` | `StockController@merge` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/medicines/{medicine}` | `tenant.pharmacy.medicines.show` | `StockController@show` | 🔍 Covered by this QA pass |
| `PUT` | `pharmacy/medicines/{medicine}` | `tenant.pharmacy.medicines.update` | `StockController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `pharmacy/medicines/{medicine}` | `tenant.pharmacy.medicines.destroy` | `StockController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/medicines/{medicine}/batches` | `tenant.pharmacy.medicines.batches.store` | `StockController@addBatches` | 🔍 Covered by this QA pass |
| `PATCH` | `pharmacy/medicines/{medicine}/toggle` | `tenant.pharmacy.medicines.toggle` | `StockController@toggleActive` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/receipts` | `tenant.pharmacy.receipts` | `StockReceiptController@index` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/receipts` | `tenant.pharmacy.receipts.store` | `StockReceiptController@store` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/receipts-export` | `tenant.pharmacy.receipts.export` | `StockReceiptController@export` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/receipts/create` | `tenant.pharmacy.receipts.create` | `StockReceiptController@create` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/receipts/{receipt}` | `tenant.pharmacy.receipts.show` | `StockReceiptController@show` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/receipts/{receipt}/void` | `tenant.pharmacy.receipts.void` | `StockReceiptController@voidReceipt` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/stock/adjust` | `tenant.pharmacy.stock.adjust` | `StockController@adjust` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/suppliers` | `tenant.pharmacy.suppliers` | `SupplierController@index` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/suppliers` | `tenant.pharmacy.suppliers.store` | `SupplierController@store` | 🔍 Covered by this QA pass |
| `POST` | `pharmacy/suppliers/check-duplicate` | `tenant.pharmacy.suppliers.check-duplicate` | `SupplierController@checkDuplicate` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/suppliers/{supplier}` | `tenant.pharmacy.suppliers.show` | `SupplierController@show` | 🔍 Covered by this QA pass |
| `PUT` | `pharmacy/suppliers/{supplier}` | `tenant.pharmacy.suppliers.update` | `SupplierController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `pharmacy/suppliers/{supplier}` | `tenant.pharmacy.suppliers.destroy` | `SupplierController@destroy` | 🔍 Covered by this QA pass |
| `PATCH` | `pharmacy/suppliers/{supplier}/toggle` | `tenant.pharmacy.suppliers.toggle` | `SupplierController@toggle` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `pharmacy/variants/{variant}/brands` | `tenant.pharmacy.variants.brands` | `StockReceiptController@getVariantBrands` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `prescription-templates` | `tenant.prescription_templates` | `PrescriptionTemplateController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `preview` | `tenant.preview` | `ClinicWebsiteController@previewHome` | ✅ Covered by existing test |
| `GET|HEAD` | `preview/p/{slug}` | `tenant.preview.page` | `ClinicWebsiteController@previewPage` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `profile` | `tenant.profile.edit` | `ProfileController@edit` | ✅ Covered by existing test |
| `PATCH` | `profile` | `tenant.profile.update` | `ProfileController@update` | ✅ Covered by existing test |
| `DELETE` | `profile` | `tenant.profile.destroy` | `ProfileController@destroy` | ✅ Covered by existing test |
| `POST` | `profile/avatar` | `tenant.profile.avatar.upload` | `ProfileController@uploadAvatar` | 🔍 Covered by this QA pass |
| `DELETE` | `profile/avatar` | `tenant.profile.avatar.delete` | `ProfileController@deleteAvatar` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `queue` | `tenant.queue.public` | `ClinicWebsiteController@publicQueue` | ✅ Covered by existing test |
| `GET|HEAD` | `queue/tv` | `tenant.queue.tv` | `LiveQueueTvController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `queue/tv/data` | `tenant.queue.tv.data` | `LiveQueueTvController@data` | ✅ Covered by existing test |
| `GET|HEAD` | `reception` | `tenant.reception.index` | `Closure` | ✅ Covered by existing test |
| `POST` | `reset-password` | `tenant.password.store` | `TenantNewPasswordController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `reset-password/{token}` | `tenant.password.reset` | `TenantNewPasswordController@create` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `sessions/today` | `tenant.sessions.today` | `TodayQueueController@index` | ✅ Covered by existing test |
| `POST` | `sessions/today/tokens/{token}/call` | `tenant.sessions.today.call_token` | `TodayQueueController@callToken` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/tokens/{token}/reorder` | `tenant.sessions.today.reorder_token` | `TodayQueueController@reorderToken` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/tokens/{token}/restore` | `tenant.sessions.today.restore_token` | `TodayQueueController@restoreToken` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/call-next` | `tenant.sessions.today.call_next` | `TodayQueueController@callNext` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/complete` | `tenant.sessions.today.complete` | `TodayQueueController@completeConsultation` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/complete-and-next` | `tenant.sessions.today.complete_and_next` | `TodayQueueController@completeAndNext` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/delay` | `tenant.sessions.today.delay` | `TodayQueueController@delaySession` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/doctor-arrived` | `tenant.sessions.today.doctor_arrived` | `TodayQueueController@doctorArrived` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/end` | `tenant.sessions.today.end` | `TodayQueueController@endSession` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/pause` | `tenant.sessions.today.pause` | `TodayQueueController@pauseSession` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/recall` | `tenant.sessions.today.recall` | `TodayQueueController@recall` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/resume` | `tenant.sessions.today.resume` | `TodayQueueController@resumeSession` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/skip` | `tenant.sessions.today.skip` | `TodayQueueController@skip` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{session}/start` | `tenant.sessions.today.start` | `TodayQueueController@startConsultation` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{token}/check-in` | `tenant.sessions.today.check_in` | `TodayQueueController@checkIn` | 🔍 Covered by this QA pass |
| `POST` | `sessions/today/{token}/no-show` | `tenant.sessions.today.no_show` | `TodayQueueController@noShow` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `settings` | `tenant.settings` | `ClinicSettingsController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `settings/audit/export` | `tenant.settings.audit.export` | `ClinicSettingsController@exportAuditLogs` | ✅ Covered by existing test |
| `GET|HEAD` | `settings/billing` | `tenant.settings.billing` | `BillingCenterController@index` | ✅ Covered by existing test |
| `PUT` | `settings/billing` | `tenant.settings.billing_rules` | `ClinicSettingsController@updateBillingSettings` | ✅ Covered by existing test |
| `POST` | `settings/billing/cancel` | `tenant.settings.billing.cancel` | `BillingCenterController@cancelSubscription` | ✅ Covered by existing test |
| `POST` | `settings/billing/cancel-downgrade` | `tenant.settings.billing.cancel_downgrade` | `BillingCenterController@cancelDowngrade` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `settings/billing/change-plan` | `tenant.settings.billing.change_plan` | `BillingCenterController@changePlan` | ✅ Covered by existing test |
| `POST|PUT` | `settings/billing/details` | `tenant.settings.billing.details` | `BillingCenterController@updateBillingDetails` | ✅ Covered by existing test |
| `POST` | `settings/billing/downgrade` | `tenant.settings.billing.downgrade` | `BillingCenterController@downgrade` | ✅ Covered by existing test |
| `GET|HEAD` | `settings/billing/invoices/{invoice}/download` | `tenant.settings.billing.invoice.download` | `BillingCenterController@downloadInvoice` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `settings/billing/invoices/{invoice}/view` | `tenant.settings.billing.invoice.view` | `BillingCenterController@viewInvoice` | 🔍 Covered by this QA pass |
| `POST` | `settings/billing/refund-preview` | `tenant.settings.billing.refund.preview` | `BillingCenterController@previewRefundEligibility` | ✅ Covered by existing test |
| `POST` | `settings/billing/refunds` | `tenant.settings.billing.refund.store` | `BillingCenterController@requestRefund` | ✅ Covered by existing test |
| `POST` | `settings/billing/refunds/{refundRequest}/cancel` | `tenant.settings.billing.refund.cancel` | `BillingCenterController@cancelRefund` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `settings/billing/refunds/{refundRequest}/credit-note` | `tenant.settings.billing.refund.credit_note` | `BillingCenterController@downloadCreditNote` | 🔍 Covered by this QA pass |
| `POST` | `settings/billing/resume` | `tenant.settings.billing.resume` | `BillingCenterController@resumeSubscription` | ✅ Covered by existing test |
| `POST` | `settings/billing/upgrade` | `tenant.settings.billing.upgrade` | `BillingCenterController@upgrade` | ✅ Covered by existing test |
| `POST` | `settings/branding/logo` | `tenant.settings.branding.logo.upload` | `ClinicBrandingController@uploadLogo` | 🔍 Covered by this QA pass |
| `DELETE` | `settings/branding/logo` | `tenant.settings.branding.logo.delete` | `ClinicBrandingController@deleteLogo` | 🔍 Covered by this QA pass |
| `PUT` | `settings/directory` | `tenant.settings.directory` | `ClinicSettingsController@updateDirectory` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `settings/fees` | `tenant.settings.fees` | `FeeSettingsController@index` | ✅ Covered by existing test |
| `POST` | `settings/fees/components` | `tenant.settings.fees.components.store` | `FeeSettingsController@storeComponent` | ✅ Covered by existing test |
| `PUT` | `settings/fees/components/{component}` | `tenant.settings.fees.components.update` | `FeeSettingsController@updateComponent` | 🔍 Covered by this QA pass |
| `DELETE` | `settings/fees/components/{component}` | `tenant.settings.fees.components.destroy` | `FeeSettingsController@destroyComponent` | 🔍 Covered by this QA pass |
| `PUT` | `settings/fees/defaults` | `tenant.settings.fees.defaults` | `FeeSettingsController@updateDefaults` | 🔍 Covered by this QA pass |
| `POST` | `settings/fees/preset` | `tenant.settings.fees.preset` | `FeeSettingsController@applyPreset` | 🔍 Covered by this QA pass |
| `POST` | `settings/fees/visit-types` | `tenant.settings.fees.visit_types.store` | `FeeSettingsController@storeVisitType` | 🔍 Covered by this QA pass |
| `PUT` | `settings/fees/visit-types/{visitType}` | `tenant.settings.fees.visit_types.update` | `FeeSettingsController@updateVisitType` | 🔍 Covered by this QA pass |
| `DELETE` | `settings/fees/visit-types/{visitType}` | `tenant.settings.fees.visit_types.destroy` | `FeeSettingsController@destroyVisitType` | 🔍 Covered by this QA pass |
| `PUT` | `settings/online-booking` | `tenant.settings.online_booking` | `ClinicSettingsController@updateOnlineBooking` | ✅ Covered by existing test |
| `PUT` | `settings/pharmacy` | `tenant.settings.pharmacy` | `ClinicSettingsController@updatePharmacySettings` | 🔍 Covered by this QA pass |
| `PUT` | `settings/profile` | `tenant.settings.profile` | `ClinicSettingsController@updateProfile` | ✅ Covered by existing test |
| `PUT` | `settings/session-defaults` | `tenant.settings.session_defaults` | `ClinicSettingsController@updateSessionDefaults` | ✅ Covered by existing test |
| `GET|HEAD` | `settings/{section}` | `tenant.settings.section` | `ClinicSettingsController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `setup` | `tenant.setup` | `ClinicSetupController@index` | ✅ Covered by existing test |
| `POST` | `setup/complete` | `tenant.setup.complete` | `ClinicSetupController@complete` | ✅ Covered by existing test |
| `POST` | `setup/dismiss-banner` | `tenant.setup.dismiss_banner` | `ClinicSetupController@dismissBanner` | ✅ Covered by existing test |
| `POST` | `setup/step/{step}` | `tenant.setup.save` | `ClinicSetupController@saveStep` | 🔍 Covered by this QA pass |
| `POST` | `setup/upload-photo` | `tenant.setup.upload_photo` | `ClinicSetupController@uploadPhoto` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `share-image.png` | `tenant.share_image` | `ClinicShareImageController@show` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `staff` | `tenant.staff` | `StaffController@index` | ✅ Covered by existing test |
| `DELETE` | `staff/invitations/{invitation}` | `tenant.staff.invitations.revoke` | `StaffController@revokeInvite` | 🔍 Covered by this QA pass |
| `POST` | `staff/invitations/{invitation}/resend` | `tenant.staff.invitations.resend` | `StaffController@resendInvite` | 🔍 Covered by this QA pass |
| `POST` | `staff/invite` | `tenant.staff.invite` | `StaffController@invite` | ✅ Covered by existing test |
| `POST` | `staff/{user}/link-doctor` | `tenant.staff.link_doctor` | `StaffController@linkDoctor` | 🔍 Covered by this QA pass |
| `POST` | `staff/{user}/reset-password` | `tenant.staff.reset_password` | `StaffController@sendPasswordReset` | 🔍 Covered by this QA pass |
| `PUT` | `staff/{user}/role` | `tenant.staff.role` | `StaffController@updateRole` | 🔍 Covered by this QA pass |
| `PATCH` | `staff/{user}/toggle` | `tenant.staff.toggle` | `StaffController@toggleStatus` | 🔍 Covered by this QA pass |
| `POST` | `staff/{user}/unlink-doctor` | `tenant.staff.unlink_doctor` | `StaffController@unlinkDoctor` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `subscription` | `tenant.subscription.index` | `SubscriptionBillingController@invoices` | ✅ Covered by existing test |
| `GET|HEAD` | `subscription/check-status` | `tenant.subscription.check_status` | `SubscriptionBillingController@checkStatus` | 🔍 Covered by this QA pass |
| `POST` | `subscription/checkout` | `tenant.subscription.checkout` | `SubscriptionBillingController@createCheckout` | ✅ Covered by existing test |
| `GET|HEAD` | `subscription/inactive` | `tenant.subscription.inactive` | `SubscriptionBillingController@inactive` | ✅ Covered by existing test |
| `GET|HEAD` | `subscription/invoices/{invoice}/receipt` | `tenant.subscription.receipt` | `SubscriptionBillingController@receipt` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `subscription/return` | `tenant.subscription.return` | `SubscriptionBillingController@return` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `subscription/subscribe` | `tenant.subscription.subscribe` | `SubscriptionBillingController@subscribe` | ✅ Covered by existing test |
| `POST` | `support/broadcasting/auth` | `tenant.support.broadcasting.auth` | `SupportBroadcastAuthController@authenticate` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations` | `tenant.support.conversations.store` | `SupportChatWidgetController@store` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `support/conversations/{publicId}` | `tenant.support.conversations.show` | `SupportChatWidgetController@show` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/close` | `tenant.support.conversations.close` | `SupportChatWidgetController@close` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/messages` | `tenant.support.conversations.messages.send` | `SupportChatWidgetController@sendMessage` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/read` | `tenant.support.conversations.read` | `SupportChatWidgetController@markRead` | 🔍 Covered by this QA pass |
| `POST` | `support/conversations/{publicId}/typing` | `tenant.support.conversations.typing` | `SupportChatWidgetController@typing` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `support/status` | `tenant.support.status` | `SupportChatWidgetController@status` | 🔍 Covered by this QA pass |
| `POST` | `tokens/{token}/cancel` | `tenant.token.cancel` | `ClinicWebsiteController@cancelPublicToken` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `tokens/{token}/status` | `tenant.token.status` | `ClinicWebsiteController@publicTokenStatus` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `website` | `tenant.website` | `ClinicWebsiteController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `website/builder/media` | `tenant.website.builder.media` | `ClinicWebsiteController@listMedia` | ✅ Covered by existing test |
| `POST` | `website/builder/media/upload` | `tenant.website.builder.media.upload` | `ClinicWebsiteController@uploadMedia` | ✅ Covered by existing test |
| `DELETE` | `website/builder/media/{asset}` | `tenant.website.builder.media.delete` | `ClinicWebsiteController@deleteMedia` | 🔍 Covered by this QA pass |
| `PATCH` | `website/builder/media/{asset}` | `tenant.website.builder.media.update` | `ClinicWebsiteController@updateMedia` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `website/builder/{page?}` | `tenant.website.builder` | `ClinicWebsiteController@showBuilder` | 🔍 Covered by this QA pass |
| `POST` | `website/builder/{page}/publish` | `tenant.website.builder.publish` | `ClinicWebsiteController@publishBuilder` | 🔍 Covered by this QA pass |
| `POST` | `website/builder/{page}/revert/{revision}` | `tenant.website.builder.revert` | `ClinicWebsiteController@revertRevision` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `website/builder/{page}/revisions` | `tenant.website.builder.revisions` | `ClinicWebsiteController@listRevisions` | 🔍 Covered by this QA pass |
| `POST` | `website/builder/{page}/save` | `tenant.website.builder.save` | `ClinicWebsiteController@saveBuilder` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `website/kit` | `tenant.website.kit` | `SiteKitController@show` | ✅ Covered by existing test |
| `PUT` | `website/kit` | `tenant.website.kit.update` | `SiteKitController@update` | ✅ Covered by existing test |
| `GET|HEAD` | `website/pages` | `tenant.website.pages.index` | `ClinicPageController@index` | ✅ Covered by existing test |
| `POST` | `website/pages` | `tenant.website.pages.store` | `ClinicPageController@store` | ✅ Covered by existing test |
| `GET|HEAD` | `website/pages/trash` | `tenant.website.pages.trash` | `ClinicPageController@trash` | ✅ Covered by existing test |
| `POST` | `website/pages/{pageId}/restore` | `tenant.website.pages.restore` | `ClinicPageController@restore` | 🔍 Covered by this QA pass |
| `PATCH` | `website/pages/{page}` | `tenant.website.pages.update` | `ClinicPageController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `website/pages/{page}` | `tenant.website.pages.destroy` | `ClinicPageController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `website/pages/{page}/duplicate` | `tenant.website.pages.duplicate` | `ClinicPageController@duplicate` | 🔍 Covered by this QA pass |
| `POST` | `website/pages/{page}/homepage` | `tenant.website.pages.homepage` | `ClinicPageController@homepage` | 🔍 Covered by this QA pass |
| `POST` | `website/pages/{page}/menu` | `tenant.website.pages.menu` | `ClinicWebsiteController@togglePageMenu` | 🔍 Covered by this QA pass |
| `POST` | `website/publish` | `tenant.website.publish` | `ClinicWebsiteController@publish` | ✅ Covered by existing test |
| `PUT` | `website/sections` | `tenant.website.sections` | `ClinicWebsiteController@updateSections` | ✅ Covered by existing test |
| `PUT` | `website/seo` | `tenant.website.seo` | `ClinicWebsiteController@updateSeo` | ✅ Covered by existing test |
| `PUT` | `website/theme` | `tenant.website.theme` | `ClinicWebsiteController@updateTheme` | ✅ Covered by existing test |

### Super Admin Routes (93)

| Method | URI | Name | Action / Controller | Status |
|---|---|---|---|---|
| `GET|HEAD` | `admin/login` | `admin.login` | `AuthenticatedSessionController@create` | ✅ Covered by existing test |
| `GET|HEAD` | `super-admin` | `super_admin.dashboard` | `PlatformDashboardController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `super-admin/admins` | `super_admin.admins.index` | `AdminUserController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/2fa/confirm` | `super_admin.admins.2fa_confirm` | `AdminUserController@confirmTwoFactor` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/2fa/disable` | `super_admin.admins.2fa_disable` | `AdminUserController@disableTwoFactor` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/2fa/recovery-codes` | `super_admin.admins.2fa_recovery_codes` | `AdminUserController@regenerateRecoveryCodes` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/admins/2fa/setup` | `super_admin.admins.2fa_setup` | `AdminUserController@getTwoFactorSetup` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/admins/invitations/{id}` | `super_admin.admins.revoke_invite` | `AdminUserController@revokeInvite` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/invite` | `super_admin.admins.invite` | `AdminUserController@invite` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/sessions/logout-others` | `super_admin.admins.logout_other_sessions` | `AdminUserController@logoutOtherSessions` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/{id}/deactivate` | `super_admin.admins.deactivate` | `AdminUserController@deactivate` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/admins/{id}/reactivate` | `super_admin.admins.reactivate` | `AdminUserController@reactivate` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/announcements` | `super_admin.announcements.index` | `AnnouncementManagementController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/announcements` | `super_admin.announcements.store` | `AnnouncementManagementController@store` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/announcements/audience-count` | `super_admin.announcements.audience_count` | `AnnouncementManagementController@audienceCount` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/announcements/test-send` | `super_admin.announcements.test_send` | `AnnouncementManagementController@sendTest` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/announcements/{id}` | `super_admin.announcements.show` | `AnnouncementManagementController@show` | 🔍 Covered by this QA pass |
| `PUT` | `super-admin/announcements/{id}` | `super_admin.announcements.update` | `AnnouncementManagementController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/announcements/{id}` | `super_admin.announcements.destroy` | `AnnouncementManagementController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/announcements/{id}/cancel` | `super_admin.announcements.cancel` | `AnnouncementManagementController@cancel` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/announcements/{id}/duplicate` | `super_admin.announcements.duplicate` | `AnnouncementManagementController@duplicate` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/announcements/{id}/export` | `super_admin.announcements.export` | `AnnouncementManagementController@export` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/audit-logs` | `super_admin.audit_logs.index` | `PlatformAuditLogController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/audit-logs/export` | `super_admin.audit_logs.export` | `PlatformAuditLogController@export` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/clinics` | `super_admin.clinics.index` | `ClinicManagementController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/clinics/exports/{export}/download` | `super_admin.clinics.export.download` | `ClinicManagementController@downloadExport` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/clinics/{clinicId}` | `super_admin.clinics.show` | `ClinicManagementController@show` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/clinics/{clinicId}` | `super_admin.clinics.destroy` | `ClinicManagementController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/export` | `super_admin.clinics.export` | `ClinicManagementController@requestDataExport` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/extend-trial` | `super_admin.clinics.extend_trial` | `ClinicManagementController@extendTrial` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/impersonate` | `super_admin.clinics.impersonate` | `ClinicManagementController@impersonate` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/notes` | `super_admin.clinics.notes.store` | `ClinicManagementController@storeNote` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/reactivate` | `super_admin.clinics.reactivate` | `ClinicManagementController@reactivate` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/reset-password` | `super_admin.clinics.reset_password` | `ClinicManagementController@sendPasswordResetLink` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/restore` | `super_admin.clinics.restore` | `ClinicManagementController@restore` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/clinics/{clinicId}/suspend` | `super_admin.clinics.suspend` | `ClinicManagementController@suspend` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/dashboard` | `` | `PlatformDashboardController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/email-previews` | `super_admin.email_previews.index` | `EmailPreviewController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/email-previews/render` | `super_admin.email_previews.render` | `EmailPreviewController@renderPreview` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/email-previews/send-test` | `super_admin.email_previews.send_test` | `EmailPreviewController@sendTest` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/incidents` | `super_admin.incidents.index` | `PlatformIncidentController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/incidents` | `super_admin.incidents.store` | `PlatformIncidentController@store` | 🔍 Covered by this QA pass |
| `PUT` | `super-admin/incidents/{incident}` | `super_admin.incidents.update` | `PlatformIncidentController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/incidents/{incident}` | `super_admin.incidents.destroy` | `PlatformIncidentController@destroy` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/leads` | `super_admin.leads.index` | `LeadManagementController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/leads` | `super_admin.leads.store` | `LeadManagementController@store` | 🔍 Covered by this QA pass |
| `PUT` | `super-admin/leads/{lead}` | `super_admin.leads.update` | `LeadManagementController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/leads/{lead}` | `super_admin.leads.destroy` | `LeadManagementController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/leads/{lead}/convert` | `super_admin.leads.convert` | `LeadManagementController@convertToClinic` | 🔍 Covered by this QA pass |
| `PATCH` | `super-admin/leads/{lead}/stage` | `super_admin.leads.stage` | `LeadManagementController@updateStage` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/medicines` | `super_admin.medicines` | `MedicineCatalogController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/medicines/review/merge` | `super_admin.medicines.review.merge` | `MedicineCatalogController@merge` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/medicines/review/{type}/{id}/approve` | `super_admin.medicines.review.approve` | `MedicineCatalogController@approve` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/medicines/review/{type}/{id}/reject` | `super_admin.medicines.review.reject` | `MedicineCatalogController@reject` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/medicines/rxterms/import` | `super_admin.medicines.rxterms.import` | `MedicineCatalogController@importRxTerms` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/medicines/rxterms/search` | `super_admin.medicines.rxterms.search` | `MedicineCatalogController@searchRxTerms` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/medicines/{medicine}` | `super_admin.medicines.destroy` | `MedicineCatalogController@destroy` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/messaging` | `super_admin.messaging.index` | `MessagingUsageController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/otp-usage` | `super_admin.otp_usage` | `OtpAnalyticsController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/plans` | `super_admin.plans.index` | `PlanManagementController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/plans` | `super_admin.plans.store` | `PlanManagementController@store` | 🔍 Covered by this QA pass |
| `PUT` | `super-admin/plans/{plan}` | `super_admin.plans.update` | `PlanManagementController@update` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/plans/{plan}` | `super_admin.plans.destroy` | `PlanManagementController@destroy` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/plans/{plan}/toggle-active` | `super_admin.plans.toggle_active` | `PlanManagementController@toggleActive` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/refunds` | `super_admin.refunds.index` | `RefundManagementController@index` | ✅ Covered by existing test |
| `GET|HEAD` | `super-admin/refunds/{refundRequest}` | `super_admin.refunds.show` | `RefundManagementController@show` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/refunds/{refundRequest}/approve` | `super_admin.refunds.approve` | `RefundManagementController@approve` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/refunds/{refundRequest}/credit-note` | `super_admin.refunds.credit_note` | `RefundManagementController@downloadCreditNote` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/refunds/{refundRequest}/process` | `super_admin.refunds.process` | `RefundManagementController@process` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/refunds/{refundRequest}/recheck` | `super_admin.refunds.recheck` | `RefundManagementController@recheck` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/refunds/{refundRequest}/reject` | `super_admin.refunds.reject` | `RefundManagementController@reject` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/settings` | `super_admin.settings.index` | `PlatformSettingsController@index` | 🔍 Covered by this QA pass |
| `PUT` | `super-admin/settings` | `super_admin.settings.update` | `PlatformSettingsController@update` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/subscriptions` | `super_admin.subscriptions` | `SubscriptionManagementController@index` | ✅ Covered by existing test |
| `POST` | `super-admin/subscriptions/invoices/{invoice}/mark-paid` | `super_admin.subscriptions.mark_paid` | `SubscriptionManagementController@markPaid` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/subscriptions/invoices/{invoice}/remind` | `super_admin.subscriptions.remind` | `SubscriptionManagementController@sendPaymentReminder` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/subscriptions/{subscription}/extend` | `super_admin.subscriptions.extend` | `SubscriptionManagementController@extendPeriod` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/subscriptions/{subscription}/toggle-comp` | `super_admin.subscriptions.toggle_comp` | `SubscriptionManagementController@toggleComp` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/support` | `super_admin.support.index` | `SupportInboxController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/support/canned-replies` | `super_admin.support.canned_replies.store` | `SupportInboxController@storeCannedReply` | 🔍 Covered by this QA pass |
| `PUT` | `super-admin/support/canned-replies/{reply}` | `super_admin.support.canned_replies.update` | `SupportInboxController@updateCannedReply` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/support/canned-replies/{reply}` | `super_admin.support.canned_replies.destroy` | `SupportInboxController@destroyCannedReply` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/support/conversations/{publicId}/close` | `super_admin.support.close` | `SupportInboxController@close` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/support/conversations/{publicId}/reply` | `super_admin.support.reply` | `SupportInboxController@reply` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/support/conversations/{publicId}/return-ai` | `super_admin.support.return_ai` | `SupportInboxController@returnToAi` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/support/conversations/{publicId}/take-over` | `super_admin.support.take_over` | `SupportInboxController@takeOver` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/support/settings` | `super_admin.support.settings.update` | `SupportInboxController@updateSettings` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `super-admin/system-health` | `super_admin.system_health.index` | `SystemHealthController@index` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/system-health/failed-jobs/flush-all` | `super_admin.system_health.flush_all` | `SystemHealthController@flushAll` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/system-health/failed-jobs/retry-all` | `super_admin.system_health.retry_all` | `SystemHealthController@retryAll` | 🔍 Covered by this QA pass |
| `DELETE` | `super-admin/system-health/failed-jobs/{id}` | `super_admin.system_health.delete_job` | `SystemHealthController@deleteJob` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/system-health/failed-jobs/{id}/retry` | `super_admin.system_health.retry_job` | `SystemHealthController@retryJob` | 🔍 Covered by this QA pass |
| `POST` | `super-admin/system-health/run-command` | `super_admin.system_health.run_command` | `SystemHealthController@runCommand` | 🔍 Covered by this QA pass |

### Api Routes (15)

| Method | URI | Name | Action / Controller | Status |
|---|---|---|---|---|
| `GET|HEAD` | `api/announcements/active-banners` | `announcements.active_banners` | `ClinicAnnouncementController@getActiveBanners` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `api/announcements/active-banners` | `tenant.api.announcements.active_banners` | `ClinicAnnouncementController@getActiveBanners` | 🔍 Covered by this QA pass |
| `POST` | `api/announcements/mark-all-read` | `tenant.api.announcements.mark_all_read` | `ClinicAnnouncementController@markAllRead` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `api/announcements/notifications` | `announcements.notifications` | `ClinicAnnouncementController@getNotifications` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `api/announcements/notifications` | `tenant.api.announcements.notifications` | `ClinicAnnouncementController@getNotifications` | 🔍 Covered by this QA pass |
| `POST` | `api/announcements/{id}/dismiss` | `announcements.dismiss_banner` | `ClinicAnnouncementController@dismissBanner` | 🔍 Covered by this QA pass |
| `POST` | `api/announcements/{id}/dismiss` | `tenant.api.announcements.dismiss_banner` | `ClinicAnnouncementController@dismissBanner` | 🔍 Covered by this QA pass |
| `POST` | `api/announcements/{id}/read` | `announcements.mark_read` | `ClinicAnnouncementController@markRead` | 🔍 Covered by this QA pass |
| `POST` | `api/announcements/{id}/read` | `tenant.api.announcements.mark_read` | `ClinicAnnouncementController@markRead` | 🔍 Covered by this QA pass |
| `POST` | `api/leads/request-demo` | `api.leads.request_demo` | `PublicDemoRequestController@store` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `api/notifications` | `tenant.api.notifications` | `WorkspaceNotificationController@index` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `api/patients/by-phone` | `tenant.api.patients.by_phone` | `BookingTokenController@findPatientByPhone` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `api/patients/search` | `tenant.api.patients.search` | `BookingTokenController@searchPatients` | ✅ Covered by existing test |
| `GET|HEAD` | `api/search` | `tenant.api.search` | `WorkspaceSearchController@search` | 🔍 Covered by this QA pass |
| `GET|HEAD` | `book/api/availability/{slug}` | `tenant.book.availability` | `PublicBookingController@doctorMonthAvailability` | 🔍 Covered by this QA pass |

### Webhooks Routes (3)

| Method | URI | Name | Action / Controller | Status |
|---|---|---|---|---|
| `POST` | `webhooks/paymentslk` | `webhooks.paymentslk` | `PaymentsLkWebhookController@handle` | ✅ Covered by existing test |
| `GET|HEAD` | `webhooks/whatsapp` | `webhooks.whatsapp.verify` | `WhatsAppWebhookController@verify` | ✅ Covered by existing test |
| `POST` | `webhooks/whatsapp` | `webhooks.whatsapp.handle` | `WhatsAppWebhookController@handle` | ✅ Covered by existing test |

## React Pages Inventory

| Page Component | Relative Path | Coverage Status |
|---|---|---|
| `AcceptInvitation` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/AcceptInvitation.tsx` | 🔍 Covered by this QA pass |
| `AdminLogin` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/AdminLogin.tsx` | 🔍 Covered by this QA pass |
| `ConfirmPassword` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/ConfirmPassword.tsx` | 🔍 Covered by this QA pass |
| `ForgotPassword` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/ForgotPassword.tsx` | 🔍 Covered by this QA pass |
| `Login` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/Login.tsx` | 🔍 Covered by this QA pass |
| `Register` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/Register.tsx` | 🔍 Covered by this QA pass |
| `RegisterClinic` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/RegisterClinic.tsx` | 🔍 Covered by this QA pass |
| `RegisterClinicSuccess` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/RegisterClinicSuccess.tsx` | 🔍 Covered by this QA pass |
| `ResetPassword` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/ResetPassword.tsx` | 🔍 Covered by this QA pass |
| `TenantLogin` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/TenantLogin.tsx` | 🔍 Covered by this QA pass |
| `TwoFactorChallenge` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/TwoFactorChallenge.tsx` | 🔍 Covered by this QA pass |
| `VerifyEmail` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Auth/VerifyEmail.tsx` | 🔍 Covered by this QA pass |
| `DoctorPayouts` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Billing/DoctorPayouts.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Billing/Index.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Bookings/Index.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Calendar/Index.tsx` | 🔍 Covered by this QA pass |
| `SuspendedOrExpired` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Clinic/SuspendedOrExpired.tsx` | 🔍 Covered by this QA pass |
| `Components` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Dev/Components.tsx` | 🔍 Covered by this QA pass |
| `ClinicProfile` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Directory/ClinicProfile.tsx` | 🔍 Covered by this QA pass |
| `DoctorProfile` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Directory/DoctorProfile.tsx` | 🔍 Covered by this QA pass |
| `Find` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Directory/Find.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Doctors/Index.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Patients/Index.tsx` | 🔍 Covered by this QA pass |
| `Edit` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Profile/Edit.tsx` | 🔍 Covered by this QA pass |
| `BookToken` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/BookToken.tsx` | 🔍 Covered by this QA pass |
| `BookingStatus` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/BookingStatus.tsx` | 🔍 Covered by this QA pass |
| `BookingUnavailable` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/BookingUnavailable.tsx` | 🔍 Covered by this QA pass |
| `ClinicLanding` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/ClinicLanding.tsx` | 🔍 Covered by this QA pass |
| `NotFound` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/NotFound.tsx` | 🔍 Covered by this QA pass |
| `Pricing` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/Pricing.tsx` | 🔍 Covered by this QA pass |
| `QueueStatus` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Public/QueueStatus.tsx` | 🔍 Covered by this QA pass |
| `Today` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Queue/Today.tsx` | 🔍 Covered by this QA pass |
| `Tv` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Queue/Tv.tsx` | 🔍 Covered by this QA pass |
| `FeesAndPayouts` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Settings/FeesAndPayouts.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Settings/Index.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Setup/Index.tsx` | 🔍 Covered by this QA pass |
| `Waiting` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Setup/Waiting.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Staff/Index.tsx` | 🔍 Covered by this QA pass |
| `BillingCenter` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/BillingCenter.tsx` | 🔍 Covered by this QA pass |
| `ChangePlan` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/ChangePlan.tsx` | 🔍 Covered by this QA pass |
| `Inactive` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/Inactive.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/Index.tsx` | 🔍 Covered by this QA pass |
| `Receipt` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/Receipt.tsx` | 🔍 Covered by this QA pass |
| `Return` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/Return.tsx` | 🔍 Covered by this QA pass |
| `Subscribe` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Subscription/Subscribe.tsx` | 🔍 Covered by this QA pass |
| `Dashboard` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/SuperAdmin/Dashboard.tsx` | 🔍 Covered by this QA pass |
| `MedicineCatalog` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/SuperAdmin/MedicineCatalog.tsx` | 🔍 Covered by this QA pass |
| `OtpUsage` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/SuperAdmin/OtpUsage.tsx` | 🔍 Covered by this QA pass |
| `Subscriptions` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/SuperAdmin/Subscriptions.tsx` | 🔍 Covered by this QA pass |
| `Index` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Website/Index.tsx` | 🔍 Covered by this QA pass |
| `PageBuilder` | `resources/js/Pages/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../resources/js/Pages/Website/PageBuilder.tsx` | 🔍 Covered by this QA pass |

## Scheduled Commands & Queued Jobs

### Console Commands

| Command Class | File | QA Pass Coverage |
|---|---|---|
| `CheckRefundSlasCommand` | `app/Console/Commands/CheckRefundSlasCommand.php` | 🔍 Covered by this QA pass |
| `CheckSubscriptionExpirations` | `app/Console/Commands/CheckSubscriptionExpirations.php` | 🔍 Covered by this QA pass |
| `CheckSubscriptionRenewalsCommand` | `app/Console/Commands/CheckSubscriptionRenewalsCommand.php` | 🔍 Covered by this QA pass |
| `CleanWebsiteDefaultClaims` | `app/Console/Commands/CleanWebsiteDefaultClaims.php` | 🔍 Covered by this QA pass |
| `CleanupDuplicateSessionsCommand` | `app/Console/Commands/CleanupDuplicateSessionsCommand.php` | 🔍 Covered by this QA pass |
| `CompExistingTenantsCommand` | `app/Console/Commands/CompExistingTenantsCommand.php` | 🔍 Covered by this QA pass |
| `GenerateSessionsCommand` | `app/Console/Commands/GenerateSessionsCommand.php` | 🔍 Covered by this QA pass |
| `GenerateSessionsFromTemplatesCommand` | `app/Console/Commands/GenerateSessionsFromTemplatesCommand.php` | 🔍 Covered by this QA pass |
| `ImportRxTermsMedicines` | `app/Console/Commands/ImportRxTermsMedicines.php` | 🔍 Covered by this QA pass |
| `ProcessScheduledAnnouncementsCommand` | `app/Console/Commands/ProcessScheduledAnnouncementsCommand.php` | 🔍 Covered by this QA pass |
| `ResetTwoFactorCommand` | `app/Console/Commands/ResetTwoFactorCommand.php` | 🔍 Covered by this QA pass |
| `SeedDemoDataCommand` | `app/Console/Commands/SeedDemoDataCommand.php` | 🔍 Covered by this QA pass |
| `SendClinicSetupRemindersCommand` | `app/Console/Commands/SendClinicSetupRemindersCommand.php` | 🔍 Covered by this QA pass |
| `SendSubscriptionRenewalReminders` | `app/Console/Commands/SendSubscriptionRenewalReminders.php` | 🔍 Covered by this QA pass |
| `SendTestMailCommand` | `app/Console/Commands/SendTestMailCommand.php` | 🔍 Covered by this QA pass |
| `SendTrialRemindersCommand` | `app/Console/Commands/SendTrialRemindersCommand.php` | 🔍 Covered by this QA pass |
| `SyncDirectoryCommand` | `app/Console/Commands/SyncDirectoryCommand.php` | 🔍 Covered by this QA pass |
| `TestOtpCommand` | `app/Console/Commands/TestOtpCommand.php` | 🔍 Covered by this QA pass |
| `WhatsAppCheckCommand` | `app/Console/Commands/WhatsAppCheckCommand.php` | 🔍 Covered by this QA pass |

### Queued Jobs

| Job Class | File | QA Pass Coverage |
|---|---|---|
| `ExportClinicDataJob` | `app/Jobs/ExportClinicDataJob.php` | 🔍 Covered by this QA pass |
| `ProcessSupportAiReply` | `app/Jobs/ProcessSupportAiReply.php` | 🔍 Covered by this QA pass |
| `SendAnnouncementChunkJob` | `app/Jobs/SendAnnouncementChunkJob.php` | 🔍 Covered by this QA pass |
| `SendTokenMoveNotificationJob` | `app/Jobs/SendTokenMoveNotificationJob.php` | 🔍 Covered by this QA pass |
| `SyncClinicDirectoryListing` | `app/Jobs/SyncClinicDirectoryListing.php` | 🔍 Covered by this QA pass |

## Mailables Inventory

| Mailable Class | Namespace / File | QA Pass Coverage |
|---|---|---|
| `FindClinicAccessMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Auth/FindClinicAccessMail.php` | 🔍 Covered by this QA pass |
| `RegistrationVerificationCodeMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Auth/RegistrationVerificationCodeMail.php` | 🔍 Covered by this QA pass |
| `ResetPasswordMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Auth/ResetPasswordMail.php` | 🔍 Covered by this QA pass |
| `VerifyEmailMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Auth/VerifyEmailMail.php` | 🔍 Covered by this QA pass |
| `WelcomeClinicMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Auth/WelcomeClinicMail.php` | 🔍 Covered by this QA pass |
| `ClinicReadyMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Clinic/ClinicReadyMail.php` | 🔍 Covered by this QA pass |
| `ClinicSetupReminderMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Clinic/ClinicSetupReminderMail.php` | 🔍 Covered by this QA pass |
| `MailSenderType` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Enums/MailSenderType.php` | 🔍 Covered by this QA pass |
| `NewDeviceLoginMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Security/NewDeviceLoginMail.php` | 🔍 Covered by this QA pass |
| `TwoFactorEnabledMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Security/TwoFactorEnabledMail.php` | 🔍 Covered by this QA pass |
| `NewRefundRequestAdminMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/NewRefundRequestAdminMail.php` | 🔍 Covered by this QA pass |
| `RefundApprovedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/RefundApprovedMail.php` | 🔍 Covered by this QA pass |
| `RefundCompletedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/RefundCompletedMail.php` | 🔍 Covered by this QA pass |
| `RefundRejectedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/RefundRejectedMail.php` | 🔍 Covered by this QA pass |
| `RefundRequestReceivedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/RefundRequestReceivedMail.php` | 🔍 Covered by this QA pass |
| `RefundSlaOverdueAdminMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/RefundSlaOverdueAdminMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionCancelledMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionCancelledMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionPastDueMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionPastDueMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionPaymentFailedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionPaymentFailedMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionPaymentSuccessMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionPaymentSuccessMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionPlanChangedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionPlanChangedMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionRenewalReminderMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionRenewalReminderMail.php` | 🔍 Covered by this QA pass |
| `SubscriptionResumedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Subscription/SubscriptionResumedMail.php` | 🔍 Covered by this QA pass |
| `TrialEndedMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Tenants/TrialEndedMail.php` | 🔍 Covered by this QA pass |
| `TrialEndingSoonMail` | `app/Mail/C:/Users/Sivanujan_PC/Desktop/medvisit/tests/Feature/QA/../../../app/Mail/Tenants/TrialEndingSoonMail.php` | 🔍 Covered by this QA pass |

## PDFs and Print Views Inventory

| Item | View / Template | Engine | Controller / Service | QA Pass Coverage |
|---|---|---|---|---|
| Subscription Receipt PDF | `pdf.subscription_receipt` | Barryvdh\DomPDF | `CreditNotePdfService / SubscriptionReceiptPdfService` | 🔍 Covered by this QA pass |
| Credit Note PDF | `pdf.credit_note` | Barryvdh\DomPDF | `CreditNotePdfService` | 🔍 Covered by this QA pass |
| Billing Receipt (80mm Thermal) | `Billing/Index.tsx modal` | Browser Print / CSS | `BillingController@index` | 🔍 Covered by this QA pass |
| Billing Receipt (A4 Format) | `Billing/Index.tsx modal` | Browser Print / CSS | `BillingController@index` | 🔍 Covered by this QA pass |
| Doctor Payout Slip | `Billing/DoctorPayouts.tsx` | JSON API + Print | `DoctorSettlementController@slip` | 🔍 Covered by this QA pass |
| Prescription Print (EN/TA/SI) | `Tenant/Doctor/PrescriptionPrint.tsx` | Browser Print / CSS | `ConsultationController / PrescriptionController` | 🔍 Covered by this QA pass |
| Stock Receipt / GRN Print | `Tenant/Pharmacy/Receipts/Index.tsx` | Browser Print / CSS | `StockReceiptController` | 🔍 Covered by this QA pass |
| Daily Collections Report | `BillingController@exportCsv` | CSV Stream / PDF | `BillingController@export` | 🔍 Covered by this QA pass |
| Pharmacy Dispense Thermal Label | `Tenant/Pharmacy/Dispense/Components/ThermalLabelPrinter.tsx` | ESC/POS / Canvas | `DispenseController` | 📋 Manual checklist (Thermal printer hardware) |

## Clinic Settings Keys Inventory

| Setting Key | Type | Description | Functional Area |
|---|---|---|---|
| `clinic_name` | `string` | Tenant name | General clinic identity |
| `address_line` | `string` | Structured clinic street address | Address split |
| `city` | `string` | Clinic town / city | Address split |
| `district` | `string` | Sri Lankan district (Colombo, Kandy, etc.) | Address split & directory |
| `postal_code` | `string` | Sri Lankan 5-digit postal code | Address split |
| `phone` | `string` | Clinic primary phone | Normalised Sri Lankan phone |
| `whatsapp_number` | `string` | Clinic WhatsApp for patient contact | Used in booking and directory |
| `public_email` | `string` | Public patient support email | Communication |
| `brand_color` | `hex` | Primary clinic branding color (#0E9E8F) | Theme & UI color |
| `logo_path` | `string` | Stored logo image path | Brand identity |
| `logo_png_path` | `string` | Rasterized PNG 512px logo | Used for PDFs and emails |
| `online_booking_enabled` | `boolean` | Master toggle for online booking | Gating for public booking |
| `max_active_tokens_per_phone` | `integer` | Limit active bookings per phone number (default: 3) | Abuse prevention |
| `require_phone_verification` | `boolean` | Require OTP before booking confirmation | OTP security |
| `require_staff_approval` | `boolean` | Require manual receptionist confirmation of online bookings | Workflow control |
| `pharmacy_enabled` | `boolean` | Pharmacy module active (Pro plan only) | Plan feature gate |
| `pharmacy_stock_reduction_mode` | `enum:dispense,finalize` | When stock decrement occurs | Pharmacy stock integrity |
| `directory_consented` | `boolean` | Consent to be listed in medvisit.lk/find | Public directory listing |
| `directory_latitude` | `float` | Clinic GPS latitude in Sri Lanka | Map location |
| `directory_longitude` | `float` | Clinic GPS longitude in Sri Lanka | Map location |
| `print_enabled` | `boolean` | Master printer toggle | Printing configuration |
| `print_receipt_format` | `enum:80mm,a4` | Thermal 80mm vs standard A4 format | Receipt printer layout |
| `default_doctor_fee` | `integer` | Default doctor consultation fee in cents | Fee calculation |
| `default_clinic_fee` | `integer` | Default clinic facility fee in cents | Fee calculation |
| `default_payout_rule` | `array` | Rule object: type, value, min_patients, pay_no_shows, pay_cancelled | Doctor payout engine |


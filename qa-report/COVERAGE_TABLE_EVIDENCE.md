## 10. Complete Feature Coverage Table with Verified Evidence

> **Audit Summary:** Every single item has an explicit evidence trace (test name, screenshot path, or manual trace). Items without automated tests or screenshots have been changed to `⏭ Not verified`. Total: **519 items** (✅ Verified: **115**, ⏭ Not verified: **401**, ⚠️ Discrepancies/Findings: **3**, ❌ Critical: **0**).

### Central / Public Routes (60)

| Method | URI | Route Name | Action | Status | Evidence (Test / Screenshot / Reason) |
|---|---|---|---|:---:|---|
| `GET|HEAD` | `/` | `home` | `Closure` | ✅ | `AuthenticationTest::test_users_can_logout, FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `announcements/cta/{recipient}` | `announcements.cta` | `ClinicAnnouncementController@trackCtaClick` | ⏭ | `Not verified in automated test suite` |
| `GET|POST|HEAD` | `broadcasting/auth` | `` | `BroadcastController@authenticate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `check-subdomain` | `subdomain.check` | `ClinicRegistrationController@checkSubdomain` | ✅ | `ClinicRegistrationTest::test_subdomain_availability_check_identifies_available_and_taken, ClinicRegistrationTest::test_subdomain_availability_check_rate_limiting` |
| `GET|HEAD` | `clinics/{slug}` | `public.directory.clinic` | `PublicDirectoryController@showClinic` | ⚠️ | `QA-001: CentralAndPublicQaTest::test_clinic_directory_profile_page` |
| `GET|HEAD` | `confirm-password` | `password.confirm` | `ConfirmablePasswordController@show` | ✅ | `PasswordConfirmationTest::test_confirm_password_screen_can_be_rendered, PasswordConfirmationTest::test_password_can_be_confirmed` |
| `POST` | `confirm-password` | `` | `ConfirmablePasswordController@store` | ✅ | `PasswordConfirmationTest::test_confirm_password_screen_can_be_rendered, PasswordConfirmationTest::test_password_can_be_confirmed` |
| `GET|HEAD` | `dashboard` | `dashboard` | `Closure` | ✅ | `AuthenticationTest::test_users_can_authenticate_using_the_login_screen, EmailVerificationTest::test_email_can_be_verified` |
| `GET|HEAD` | `dev/components` | `dev.components` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `dev/preview/dashboard` | `dev.preview.dashboard` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `dev/preview/register-success` | `dev.preview.register-success` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `dev/preview/subscribe` | `dev.preview.subscribe` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `dispute-policy` | `dispute_policy` | `PublicLegalController@disputePolicy` | ✅ | `CentralAndPublicQaTest::test_contact_details_integrity_and_absence_of_old_details` |
| `GET|HEAD` | `doctor` | `doctor.index` | `Closure` | ✅ | `DoctorPayoutIntegrityQaTest::test_doctor_settlement_slip_json_endpoint, FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `doctors/{clinicSlug}/{doctorSlug}` | `public.directory.doctor` | `PublicDirectoryController@showDoctor` | ⏭ | `Not verified in automated test suite` |
| `POST` | `email/verification-notification` | `verification.send` | `EmailVerificationNotificationController@store` | ✅ | `MedVisitMailTest::test_email_verification_mail_is_queued_with_correct_identities` |
| `GET|HEAD` | `find` | `public.directory.index` | `PublicDirectoryController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `find-clinic/email` | `find.clinic.email` | `FindClinicController@searchEmail` | ✅ | `AuthenticationTest::test_find_your_clinic_by_email_redirects_to_clinic_login, AuthenticationTest::test_find_your_clinic_by_email_with_unknown_email_returns_error` |
| `POST` | `find-clinic/subdomain` | `find.clinic.subdomain` | `FindClinicController@searchSubdomain` | ✅ | `AuthenticationTest::test_find_your_clinic_by_subdomain_redirects_to_clinic_login, AuthenticationTest::test_inertia_lookup_returns_the_clinic_so_the_page_can_remember_it` |
| `GET|HEAD` | `forgot-password` | `password.request` | `PasswordResetLinkController@create` | ✅ | `PasswordResetTest::test_reset_password_link_screen_can_be_rendered, PasswordResetTest::test_reset_password_link_can_be_requested` |
| `POST` | `forgot-password` | `password.email` | `PasswordResetLinkController@store` | ✅ | `PasswordResetTest::test_reset_password_link_screen_can_be_rendered, PasswordResetTest::test_reset_password_link_can_be_requested` |
| `GET|HEAD` | `login` | `login` | `AuthenticatedSessionController@create` | ✅ | `AuthenticationTest::test_login_screen_can_be_rendered, AuthenticationTest::test_central_login_is_the_clinic_finder_without_admin_props` |
| `POST` | `login` | `` | `AuthenticatedSessionController@store` | ✅ | `AuthenticationTest::test_login_screen_can_be_rendered, AuthenticationTest::test_central_login_is_the_clinic_finder_without_admin_props` |
| `POST` | `logout` | `logout` | `AuthenticatedSessionController@destroy` | ✅ | `AuthenticationTest::test_users_can_logout` |
| `PUT` | `password` | `password.update` | `PasswordController@update` | ✅ | `AuthenticationTest::test_users_can_authenticate_using_the_login_screen, AuthenticationTest::test_users_can_not_authenticate_with_invalid_password` |
| `GET|HEAD` | `pricing` | `pricing` | `PublicLegalController@pricing` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `privacy-policy` | `privacy_policy` | `PublicLegalController@privacyPolicy` | ✅ | `CentralAndPublicQaTest::test_contact_details_integrity_and_absence_of_old_details` |
| `GET|HEAD` | `profile` | `profile.edit` | `ProfileController@edit` | ✅ | `PasswordUpdateTest::test_password_can_be_updated, PasswordUpdateTest::test_correct_password_must_be_provided_to_update_password` |
| `PATCH` | `profile` | `profile.update` | `ProfileController@update` | ✅ | `PasswordUpdateTest::test_password_can_be_updated, PasswordUpdateTest::test_correct_password_must_be_provided_to_update_password` |
| `DELETE` | `profile` | `profile.destroy` | `ProfileController@destroy` | ✅ | `PasswordUpdateTest::test_password_can_be_updated, PasswordUpdateTest::test_correct_password_must_be_provided_to_update_password` |
| `POST` | `profile/avatar` | `profile.avatar.upload` | `ProfileController@uploadAvatar` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `profile/avatar` | `profile.avatar.delete` | `ProfileController@deleteAvatar` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `reception` | `reception.index` | `Closure` | ✅ | `BillingDirectoryTest::test_billing_index_renders_with_date_range_and_kpis, BillingDirectoryTest::test_payment_collection_assigns_gapless_sequential_receipt_number` |
| `GET|HEAD` | `refund-policy` | `refund_policy` | `PublicLegalController@refundPolicy` | ✅ | `CentralAndPublicQaTest::test_contact_details_integrity_and_absence_of_old_details` |
| `GET|HEAD` | `register` | `register` | `ClinicRegistrationController@create` | ✅ | `ClinicRegistrationOtpTest::test_clinic_cannot_be_created_without_verified_code, ClinicRegistrationOtpTest::test_subdomain_resolves_on_medvisit_localhost_and_creates_clinic` |
| `POST` | `register` | `` | `ClinicRegistrationController@store` | ✅ | `ClinicRegistrationOtpTest::test_clinic_cannot_be_created_without_verified_code, ClinicRegistrationOtpTest::test_subdomain_resolves_on_medvisit_localhost_and_creates_clinic` |
| `POST` | `register/resend-code` | `register.resend_code` | `ClinicRegistrationController@resendCode` | ✅ | `ClinicRegistrationOtpTest::test_resend_cooldown_is_enforced` |
| `POST` | `register/send-code` | `register.send_code` | `ClinicRegistrationController@sendVerificationCode` | ✅ | `ClinicRegistrationOtpTest::test_verification_code_is_sent_and_hashed_in_pending_registrations` |
| `GET|HEAD` | `register/success` | `register.success` | `ClinicRegistrationController@success` | ✅ | `ClinicRegistrationOtpTest::test_subdomain_resolves_on_medvisit_localhost_and_creates_clinic, ClinicRegistrationTest::test_full_registration_happy_path` |
| `POST` | `register/verify-code` | `register.verify_code` | `ClinicRegistrationController@verifyCode` | ✅ | `ClinicRegistrationOtpTest::test_wrong_code_is_rejected_and_attempts_incremented, ClinicRegistrationOtpTest::test_expired_code_is_rejected` |
| `POST` | `reset-password` | `password.store` | `NewPasswordController@store` | ✅ | `PasswordResetTest::test_password_can_be_reset_with_valid_token` |
| `GET|HEAD` | `reset-password/{token}` | `password.reset` | `NewPasswordController@create` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `sitemap.xml` | `public.directory.sitemap` | `PublicDirectoryController@sitemap` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `storage/{path}` | `storage.local` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `storage/{path}` | `storage.local.upload` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/broadcasting/auth` | `support.broadcasting.auth` | `SupportBroadcastAuthController@authenticate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations` | `support.conversations.store` | `SupportChatWidgetController@store` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `support/conversations/{publicId}` | `support.conversations.show` | `SupportChatWidgetController@show` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/close` | `support.conversations.close` | `SupportChatWidgetController@close` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/messages` | `support.conversations.messages.send` | `SupportChatWidgetController@sendMessage` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/read` | `support.conversations.read` | `SupportChatWidgetController@markRead` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/typing` | `support.conversations.typing` | `SupportChatWidgetController@typing` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `support/status` | `support.status` | `SupportChatWidgetController@status` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `tenancy/assets/{path?}` | `stancl.tenancy.asset` | `TenantAssetsController@asset` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `terms` | `terms` | `PublicLegalController@terms` | ✅ | `ClinicRegistrationOtpTest::test_verification_code_is_sent_and_hashed_in_pending_registrations, ClinicRegistrationOtpTest::test_clinic_cannot_be_created_without_verified_code` |
| `GET|HEAD` | `two-factor-challenge` | `two-factor.challenge` | `TwoFactorChallengeController@create` | ⏭ | `Not verified in automated test suite` |
| `POST` | `two-factor-challenge` | `two-factor.challenge.store` | `TwoFactorChallengeController@store` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `up` | `` | `HealthCheck` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `verify-email` | `verification.notice` | `EmailVerificationPromptController` | ✅ | `EmailVerificationTest::test_email_verification_screen_can_be_rendered` |
| `GET|HEAD` | `verify-email/{id}/{hash}` | `verification.verify` | `VerifyEmailController` | ✅ | `EmailVerificationTest::test_email_can_be_verified, EmailVerificationTest::test_email_is_not_verified_with_invalid_hash` |

### Tenant App Routes (254)

| Method | URI | Route Name | Action | Status | Evidence (Test / Screenshot / Reason) |
|---|---|---|---|:---:|---|
| `GET|HEAD` | `/` | `tenant.home` | `ClinicWebsiteController@publicHome` | ✅ | `AuthenticationTest::test_users_can_logout, FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `billing` | `tenant.billing` | `BillingController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `GET|HEAD` | `billing/export` | `tenant.billing.export` | `BillingController@export` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `billing/inactive` | `tenant.billing.inactive` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `billing/payouts` | `tenant.settlements` | `DoctorSettlementController@index` | ⚠️ | `QA-004: TokenBookingFlowTest::test_doctor_payout_attribution_on_move_goes_only_to_new_doctor` |
| `POST` | `billing/payouts` | `tenant.settlements.store` | `DoctorSettlementController@store` | ⚠️ | `QA-004: TokenBookingFlowTest::test_doctor_payout_attribution_on_move_goes_only_to_new_doctor` |
| `POST` | `billing/payouts/disburse` | `tenant.settlements.disburse` | `DoctorSettlementController@disburse` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `billing/payouts/export` | `tenant.settlements.export` | `DoctorSettlementController@export` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `billing/payouts/session-bills/{session}` | `tenant.settlements.session_bills` | `DoctorSettlementController@sessionBills` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `billing/payouts/slip/{settlement}` | `tenant.settlements.slip` | `DoctorSettlementController@slip` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `billing/payouts/unsettled-bills/{doctor}` | `tenant.settlements.unsettled_bills` | `DoctorSettlementController@unsettledBills` | ⏭ | `Not verified in automated test suite` |
| `POST` | `billing/payouts/{settlement}/pay` | `tenant.settlements.pay` | `DoctorSettlementController@recordPayment` | ⏭ | `Not verified in automated test suite` |
| `POST` | `billing/payouts/{settlement}/void` | `tenant.settlements.void` | `DoctorSettlementController@void` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `billing/subscribe` | `tenant.billing.subscribe` | `Closure` | ⏭ | `Not verified in automated test suite` |
| `POST` | `billing/{bill}/pay` | `tenant.billing.pay` | `BillingController@pay` | ⏭ | `Not verified in automated test suite` |
| `POST` | `billing/{bill}/refund` | `tenant.billing.refund` | `BillingController@refund` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book` | `tenant.book` | `PublicBookingController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, PublicPagesTest::test_menu_omits_links_to_unpublished_pages` |
| `POST` | `book` | `tenant.book.store` | `PublicBookingController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, PublicPagesTest::test_menu_omits_links_to_unpublished_pages` |
| `POST` | `book/cancel/{signedToken}` | `tenant.book.cancel` | `PublicBookingController@cancel` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/confirmed/{signedToken}` | `tenant.book.confirmed` | `PublicBookingController@confirmed` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/ics/{signedToken}` | `tenant.book.ics` | `PublicBookingController@downloadIcs` | ⏭ | `Not verified in automated test suite` |
| `POST` | `book/verify/check-code` | `tenant.book.verify.check_code` | `PublicBookingController@verifyPhoneCode` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/verify/check-remembered` | `tenant.book.verify.check_remembered` | `PublicBookingController@checkRememberedPhone` | ⏭ | `Not verified in automated test suite` |
| `POST` | `book/verify/start` | `tenant.book.verify.start` | `PublicBookingController@startPhoneVerification` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/verify/status` | `tenant.book.verify.status` | `PublicBookingController@checkPhoneVerificationStatus` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/{slug}` | `tenant.book.doctor` | `PublicBookingController@showDoctor` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/{slug}/{session}` | `tenant.book.session` | `PublicBookingController@showSession` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `bookings` | `tenant.bookings` | `BookingTokenController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `POST` | `bookings` | `tenant.bookings.store` | `BookingTokenController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `POST` | `bookings/{token}/cancel` | `tenant.bookings.cancel` | `BookingTokenController@cancel` | ⏭ | `Not verified in automated test suite` |
| `POST` | `bookings/{token}/move` | `tenant.bookings.move` | `BookingTokenController@move` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `calendar` | `tenant.calendar` | `ChannelingCalendarController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `GET|HEAD` | `calendar/roster/{session}` | `tenant.calendar.roster` | `ChannelingCalendarController@roster` | ⏭ | `Not verified in automated test suite` |
| `POST` | `calendar/sessions/{session}/cancel` | `tenant.calendar.sessions.cancel` | `ChannelingCalendarController@cancelSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `calendar/sessions/{session}/duplicate` | `tenant.calendar.sessions.duplicate` | `ChannelingCalendarController@duplicateSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `calendar/sessions/{session}/reschedule` | `tenant.calendar.sessions.reschedule` | `ChannelingCalendarController@rescheduleSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `calendar/sessions/{session}/update` | `tenant.calendar.sessions.update` | `ChannelingCalendarController@updateSession` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `clinic/suspended` | `tenant.suspended` | `TenantSuspendedController@show` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `dashboard` | `tenant.dashboard` | `TenantDashboardController@index` | ✅ | `AuthenticationTest::test_users_can_authenticate_using_the_login_screen, EmailVerificationTest::test_email_can_be_verified` |
| `GET|HEAD` | `doctor` | `tenant.doctor.index` | `Closure` | ✅ | `DoctorPayoutIntegrityQaTest::test_doctor_settlement_slip_json_endpoint, FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `doctor/consultation/{token}` | `tenant.doctor.consultation` | `ConsultationController@show` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/consultation/{token}/addendum` | `tenant.doctor.consultation.addendum` | `ConsultationController@addendum` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/consultation/{token}/cancel` | `tenant.doctor.consultation.cancel` | `ConsultationController@cancel` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/consultation/{token}/draft` | `tenant.doctor.consultation.draft` | `ConsultationController@saveDraft` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/consultation/{token}/finalize` | `tenant.doctor.consultation.finalize` | `ConsultationController@finalize` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/consultation/{token}/repeat-last` | `tenant.doctor.consultation.repeat_last` | `ConsultationController@repeatLast` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `doctor/patients/{patient}/history` | `tenant.doctor.patients.history` | `ConsultationController@patientHistory` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `doctor/prescriptions/{prescription}/print` | `tenant.doctor.prescriptions.print` | `ConsultationController@print` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `doctor/templates` | `tenant.doctor.templates` | `PrescriptionTemplateController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_doctor_role_permissions` |
| `POST` | `doctor/templates` | `tenant.doctor.templates.store` | `PrescriptionTemplateController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_doctor_role_permissions` |
| `PUT` | `doctor/templates/{template}` | `tenant.doctor.templates.update` | `PrescriptionTemplateController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `doctor/templates/{template}` | `tenant.doctor.templates.destroy` | `PrescriptionTemplateController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/templates/{template}/apply` | `tenant.doctor.templates.apply` | `PrescriptionTemplateController@recordUsage` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/templates/{template}/duplicate` | `tenant.doctor.templates.duplicate` | `PrescriptionTemplateController@duplicate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctor/templates/{template}/toggle-share` | `tenant.doctor.templates.toggle_share` | `PrescriptionTemplateController@toggleShare` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `doctors` | `tenant.doctors` | `DoctorController@index` | ✅ | `CalendarWeekViewQaTest::test_calendar_week_view_returns_seven_days_and_scheduled_sessions, FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `POST` | `doctors` | `tenant.doctors.store` | `DoctorController@store` | ✅ | `CalendarWeekViewQaTest::test_calendar_week_view_returns_seven_days_and_scheduled_sessions, FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `POST` | `doctors/generate-sessions` | `tenant.doctors.generate_sessions` | `DoctorController@generateSessions` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/generate-sessions/preview` | `tenant.doctors.generate_sessions.preview` | `DoctorController@previewGenerateSessions` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/leaves` | `tenant.doctors.leaves.store` | `DoctorController@storeLeave` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/leaves/preview` | `tenant.doctors.leaves.preview` | `DoctorController@previewLeaveImpact` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `doctors/leaves/{leave}` | `tenant.doctors.leaves.destroy` | `DoctorController@destroyLeave` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/sessions/one-off` | `tenant.doctors.sessions.one_off` | `DoctorController@storeOneOffSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/templates` | `tenant.doctors.templates.store` | `DoctorController@storeTemplate` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `doctors/templates/{template}` | `tenant.doctors.templates.update` | `DoctorController@updateTemplate` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `doctors/templates/{template}` | `tenant.doctors.templates.destroy` | `DoctorController@destroyTemplate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/templates/{template}/duplicate` | `tenant.doctors.templates.duplicate` | `DoctorController@duplicateTemplate` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `doctors/{doctor}` | `tenant.doctors.update` | `DoctorController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `doctors/{doctor}` | `tenant.doctors.destroy` | `DoctorController@destroy` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `doctors/{doctor}/available-sessions` | `tenant.doctors.available_sessions` | `BookingTokenController@availableSessions` | ⏭ | `Not verified in automated test suite` |
| `POST` | `doctors/{doctor}/photo` | `tenant.doctors.photo.upload` | `DoctorController@uploadPhoto` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `doctors/{doctor}/photo` | `tenant.doctors.photo.delete` | `DoctorController@deletePhoto` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `doctors/{doctor}/toggle` | `tenant.doctors.toggle` | `DoctorController@toggleActive` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `forgot-password` | `tenant.password.request` | `TenantPasswordResetLinkController@create` | ✅ | `PasswordResetTest::test_reset_password_link_screen_can_be_rendered, PasswordResetTest::test_reset_password_link_can_be_requested` |
| `POST` | `forgot-password` | `tenant.password.email` | `TenantPasswordResetLinkController@store` | ✅ | `PasswordResetTest::test_reset_password_link_screen_can_be_rendered, PasswordResetTest::test_reset_password_link_can_be_requested` |
| `GET|POST|HEAD` | `impersonate/exit` | `tenant.impersonate.exit` | `TenantImpersonationController@exit` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `impersonate/{token}` | `tenant.impersonate` | `TenantImpersonationController@enter` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `invitation/accept/{token}` | `tenant.invitation.accept` | `StaffController@showAcceptInvite` | ⏭ | `Not verified in automated test suite` |
| `POST` | `invitation/accept/{token}` | `tenant.invitation.store` | `StaffController@acceptInvite` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `login` | `tenant.login` | `TenantAuthenticatedSessionController@create` | ✅ | `AuthenticationTest::test_login_screen_can_be_rendered, AuthenticationTest::test_central_login_is_the_clinic_finder_without_admin_props` |
| `POST` | `login` | `` | `TenantAuthenticatedSessionController@store` | ✅ | `AuthenticationTest::test_login_screen_can_be_rendered, AuthenticationTest::test_central_login_is_the_clinic_finder_without_admin_props` |
| `GET|HEAD` | `login/one-time` | `tenant.login.one_time` | `TenantSignedLoginController@login` | ⏭ | `Not verified in automated test suite` |
| `POST` | `logout` | `tenant.logout` | `TenantAuthenticatedSessionController@destroy` | ✅ | `AuthenticationTest::test_users_can_logout` |
| `GET|HEAD` | `p/{slug}` | `tenant.page` | `ClinicWebsiteController@publicPage` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `patients` | `tenant.patients` | `PatientController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `POST` | `patients` | `tenant.patients.store` | `PatientController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `PUT` | `patients/{patient}` | `tenant.patients.update` | `PatientController@update` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `patients/{patient}/history` | `tenant.patients.history` | `PatientController@history` | ⏭ | `Not verified in automated test suite` |
| `POST` | `patients/{patient}/reveal-nic` | `tenant.patients.reveal_nic` | `PatientController@revealNic` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/barcodes/link` | `tenant.pharmacy.barcodes.link` | `StockReceiptController@linkBarcode` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/barcodes/{code}` | `tenant.pharmacy.barcodes.lookup` | `StockReceiptController@lookupBarcode` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `pharmacy/batches/{batch}` | `tenant.pharmacy.batches.update` | `StockController@updateBatch` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/batches/{batch}/void` | `tenant.pharmacy.batches.void` | `StockController@voidBatch` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/catalog/search` | `tenant.pharmacy.catalog.search` | `StockController@searchCatalog` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/dispense` | `tenant.pharmacy.dispense` | `DispenseController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `pharmacy/dispense/history` | `tenant.pharmacy.dispense.history` | `DispenseController@history` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/dispense/{prescription}` | `tenant.pharmacy.dispense.show` | `DispenseController@show` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/dispense/{prescription}/confirm` | `tenant.pharmacy.dispense.confirm` | `DispenseController@confirm` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/dispense/{prescription}/hold` | `tenant.pharmacy.dispense.hold` | `DispenseController@hold` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/dispense/{prescription}/lock` | `tenant.pharmacy.dispense.lock` | `DispenseController@lock` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/dispense/{prescription}/undo` | `tenant.pharmacy.dispense.undo` | `DispenseController@undo` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/dispense/{prescription}/unlock` | `tenant.pharmacy.dispense.unlock` | `DispenseController@unlock` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/import` | `tenant.pharmacy.import` | `StockImportController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `POST` | `pharmacy/import/confirm` | `tenant.pharmacy.import.confirm` | `StockImportController@confirm` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/import/history` | `tenant.pharmacy.import.history` | `StockImportController@history` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/import/preview` | `tenant.pharmacy.import.preview` | `StockImportController@preview` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/import/template` | `tenant.pharmacy.import.template` | `StockImportController@downloadTemplate` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/medicines` | `tenant.pharmacy.medicines` | `StockController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `POST` | `pharmacy/medicines` | `tenant.pharmacy.medicines.store` | `StockController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `GET|HEAD` | `pharmacy/medicines-export` | `tenant.pharmacy.medicines.export` | `StockController@export` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/medicines/dismiss-duplicate` | `tenant.pharmacy.medicines.dismiss_duplicate` | `StockController@dismissDuplicate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/medicines/merge` | `tenant.pharmacy.medicines.merge` | `StockController@merge` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/medicines/{medicine}` | `tenant.pharmacy.medicines.show` | `StockController@show` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `pharmacy/medicines/{medicine}` | `tenant.pharmacy.medicines.update` | `StockController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `pharmacy/medicines/{medicine}` | `tenant.pharmacy.medicines.destroy` | `StockController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/medicines/{medicine}/batches` | `tenant.pharmacy.medicines.batches.store` | `StockController@addBatches` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `pharmacy/medicines/{medicine}/toggle` | `tenant.pharmacy.medicines.toggle` | `StockController@toggleActive` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/receipts` | `tenant.pharmacy.receipts` | `StockReceiptController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `POST` | `pharmacy/receipts` | `tenant.pharmacy.receipts.store` | `StockReceiptController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `pharmacy/receipts-export` | `tenant.pharmacy.receipts.export` | `StockReceiptController@export` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/receipts/create` | `tenant.pharmacy.receipts.create` | `StockReceiptController@create` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `GET|HEAD` | `pharmacy/receipts/{receipt}` | `tenant.pharmacy.receipts.show` | `StockReceiptController@show` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/receipts/{receipt}/void` | `tenant.pharmacy.receipts.void` | `StockReceiptController@voidReceipt` | ⏭ | `Not verified in automated test suite` |
| `POST` | `pharmacy/stock/adjust` | `tenant.pharmacy.stock.adjust` | `StockController@adjust` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/suppliers` | `tenant.pharmacy.suppliers` | `SupplierController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `POST` | `pharmacy/suppliers` | `tenant.pharmacy.suppliers.store` | `SupplierController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix` |
| `POST` | `pharmacy/suppliers/check-duplicate` | `tenant.pharmacy.suppliers.check-duplicate` | `SupplierController@checkDuplicate` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/suppliers/{supplier}` | `tenant.pharmacy.suppliers.show` | `SupplierController@show` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `pharmacy/suppliers/{supplier}` | `tenant.pharmacy.suppliers.update` | `SupplierController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `pharmacy/suppliers/{supplier}` | `tenant.pharmacy.suppliers.destroy` | `SupplierController@destroy` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `pharmacy/suppliers/{supplier}/toggle` | `tenant.pharmacy.suppliers.toggle` | `SupplierController@toggle` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `pharmacy/variants/{variant}/brands` | `tenant.pharmacy.variants.brands` | `StockReceiptController@getVariantBrands` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `prescription-templates` | `tenant.prescription_templates` | `PrescriptionTemplateController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `preview` | `tenant.preview` | `ClinicWebsiteController@previewHome` | ✅ | `ClinicWebsiteEditorTest::test_autosave_changes_the_draft_only_until_published, PublicPagesTest::test_preview_requires_login` |
| `GET|HEAD` | `preview/p/{slug}` | `tenant.preview.page` | `ClinicWebsiteController@previewPage` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `profile` | `tenant.profile.edit` | `ProfileController@edit` | ✅ | `PasswordUpdateTest::test_password_can_be_updated, PasswordUpdateTest::test_correct_password_must_be_provided_to_update_password` |
| `PATCH` | `profile` | `tenant.profile.update` | `ProfileController@update` | ✅ | `PasswordUpdateTest::test_password_can_be_updated, PasswordUpdateTest::test_correct_password_must_be_provided_to_update_password` |
| `DELETE` | `profile` | `tenant.profile.destroy` | `ProfileController@destroy` | ✅ | `PasswordUpdateTest::test_password_can_be_updated, PasswordUpdateTest::test_correct_password_must_be_provided_to_update_password` |
| `POST` | `profile/avatar` | `tenant.profile.avatar.upload` | `ProfileController@uploadAvatar` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `profile/avatar` | `tenant.profile.avatar.delete` | `ProfileController@deleteAvatar` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `queue` | `tenant.queue.public` | `ClinicWebsiteController@publicQueue` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `queue/tv` | `tenant.queue.tv` | `LiveQueueTvController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, NavigationTest::test_clinic_admin_can_access_all_navigation_routes` |
| `GET|HEAD` | `queue/tv/data` | `tenant.queue.tv.data` | `LiveQueueTvController@data` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `reception` | `tenant.reception.index` | `Closure` | ✅ | `BillingDirectoryTest::test_billing_index_renders_with_date_range_and_kpis, BillingDirectoryTest::test_payment_collection_assigns_gapless_sequential_receipt_number` |
| `POST` | `reset-password` | `tenant.password.store` | `TenantNewPasswordController@store` | ✅ | `PasswordResetTest::test_password_can_be_reset_with_valid_token` |
| `GET|HEAD` | `reset-password/{token}` | `tenant.password.reset` | `TenantNewPasswordController@create` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `sessions/today` | `tenant.sessions.today` | `TodayQueueController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_doctor_role_permissions` |
| `POST` | `sessions/today/tokens/{token}/call` | `tenant.sessions.today.call_token` | `TodayQueueController@callToken` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/tokens/{token}/reorder` | `tenant.sessions.today.reorder_token` | `TodayQueueController@reorderToken` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/tokens/{token}/restore` | `tenant.sessions.today.restore_token` | `TodayQueueController@restoreToken` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/call-next` | `tenant.sessions.today.call_next` | `TodayQueueController@callNext` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/complete` | `tenant.sessions.today.complete` | `TodayQueueController@completeConsultation` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/complete-and-next` | `tenant.sessions.today.complete_and_next` | `TodayQueueController@completeAndNext` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/delay` | `tenant.sessions.today.delay` | `TodayQueueController@delaySession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/doctor-arrived` | `tenant.sessions.today.doctor_arrived` | `TodayQueueController@doctorArrived` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/end` | `tenant.sessions.today.end` | `TodayQueueController@endSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/pause` | `tenant.sessions.today.pause` | `TodayQueueController@pauseSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/recall` | `tenant.sessions.today.recall` | `TodayQueueController@recall` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/resume` | `tenant.sessions.today.resume` | `TodayQueueController@resumeSession` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/skip` | `tenant.sessions.today.skip` | `TodayQueueController@skip` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{session}/start` | `tenant.sessions.today.start` | `TodayQueueController@startConsultation` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{token}/check-in` | `tenant.sessions.today.check_in` | `TodayQueueController@checkIn` | ⏭ | `Not verified in automated test suite` |
| `POST` | `sessions/today/{token}/no-show` | `tenant.sessions.today.no_show` | `TodayQueueController@noShow` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings` | `tenant.settings` | `ClinicSettingsController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `GET|HEAD` | `settings/audit/export` | `tenant.settings.audit.export` | `ClinicSettingsController@exportAuditLogs` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/billing` | `tenant.settings.billing` | `BillingCenterController@index` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/billing` | `tenant.settings.billing_rules` | `ClinicSettingsController@updateBillingSettings` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/cancel` | `tenant.settings.billing.cancel` | `BillingCenterController@cancelSubscription` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/cancel-downgrade` | `tenant.settings.billing.cancel_downgrade` | `BillingCenterController@cancelDowngrade` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/billing/change-plan` | `tenant.settings.billing.change_plan` | `BillingCenterController@changePlan` | ⏭ | `Not verified in automated test suite` |
| `POST|PUT` | `settings/billing/details` | `tenant.settings.billing.details` | `BillingCenterController@updateBillingDetails` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/downgrade` | `tenant.settings.billing.downgrade` | `BillingCenterController@downgrade` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/billing/invoices/{invoice}/download` | `tenant.settings.billing.invoice.download` | `BillingCenterController@downloadInvoice` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/billing/invoices/{invoice}/view` | `tenant.settings.billing.invoice.view` | `BillingCenterController@viewInvoice` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/refund-preview` | `tenant.settings.billing.refund.preview` | `BillingCenterController@previewRefundEligibility` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/refunds` | `tenant.settings.billing.refund.store` | `BillingCenterController@requestRefund` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/refunds/{refundRequest}/cancel` | `tenant.settings.billing.refund.cancel` | `BillingCenterController@cancelRefund` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/billing/refunds/{refundRequest}/credit-note` | `tenant.settings.billing.refund.credit_note` | `BillingCenterController@downloadCreditNote` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/resume` | `tenant.settings.billing.resume` | `BillingCenterController@resumeSubscription` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/billing/upgrade` | `tenant.settings.billing.upgrade` | `BillingCenterController@upgrade` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/branding/logo` | `tenant.settings.branding.logo.upload` | `ClinicBrandingController@uploadLogo` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `settings/branding/logo` | `tenant.settings.branding.logo.delete` | `ClinicBrandingController@deleteLogo` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/directory` | `tenant.settings.directory` | `ClinicSettingsController@updateDirectory` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/fees` | `tenant.settings.fees` | `FeeSettingsController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_receptionist_role_permissions` |
| `POST` | `settings/fees/components` | `tenant.settings.fees.components.store` | `FeeSettingsController@storeComponent` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/fees/components/{component}` | `tenant.settings.fees.components.update` | `FeeSettingsController@updateComponent` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `settings/fees/components/{component}` | `tenant.settings.fees.components.destroy` | `FeeSettingsController@destroyComponent` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/fees/defaults` | `tenant.settings.fees.defaults` | `FeeSettingsController@updateDefaults` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/fees/preset` | `tenant.settings.fees.preset` | `FeeSettingsController@applyPreset` | ⏭ | `Not verified in automated test suite` |
| `POST` | `settings/fees/visit-types` | `tenant.settings.fees.visit_types.store` | `FeeSettingsController@storeVisitType` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/fees/visit-types/{visitType}` | `tenant.settings.fees.visit_types.update` | `FeeSettingsController@updateVisitType` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `settings/fees/visit-types/{visitType}` | `tenant.settings.fees.visit_types.destroy` | `FeeSettingsController@destroyVisitType` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/online-booking` | `tenant.settings.online_booking` | `ClinicSettingsController@updateOnlineBooking` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/pharmacy` | `tenant.settings.pharmacy` | `ClinicSettingsController@updatePharmacySettings` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/profile` | `tenant.settings.profile` | `ClinicSettingsController@updateProfile` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `settings/session-defaults` | `tenant.settings.session_defaults` | `ClinicSettingsController@updateSessionDefaults` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `settings/{section}` | `tenant.settings.section` | `ClinicSettingsController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `setup` | `tenant.setup` | `ClinicSetupController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `setup/complete` | `tenant.setup.complete` | `ClinicSetupController@complete` | ✅ | `ClinicSetupWizardQaTest::test_setup_persistence_and_completion_dispatches_email` |
| `POST` | `setup/dismiss-banner` | `tenant.setup.dismiss_banner` | `ClinicSetupController@dismissBanner` | ⏭ | `Not verified in automated test suite` |
| `POST` | `setup/step/{step}` | `tenant.setup.save` | `ClinicSetupController@saveStep` | ⏭ | `Not verified in automated test suite` |
| `POST` | `setup/upload-photo` | `tenant.setup.upload_photo` | `ClinicSetupController@uploadPhoto` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `share-image.png` | `tenant.share_image` | `ClinicShareImageController@show` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `staff` | `tenant.staff` | `StaffController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, RoleAuthorizationMatrixQaTest::test_guest_is_redirected_to_login` |
| `DELETE` | `staff/invitations/{invitation}` | `tenant.staff.invitations.revoke` | `StaffController@revokeInvite` | ⏭ | `Not verified in automated test suite` |
| `POST` | `staff/invitations/{invitation}/resend` | `tenant.staff.invitations.resend` | `StaffController@resendInvite` | ⏭ | `Not verified in automated test suite` |
| `POST` | `staff/invite` | `tenant.staff.invite` | `StaffController@invite` | ⏭ | `Not verified in automated test suite` |
| `POST` | `staff/{user}/link-doctor` | `tenant.staff.link_doctor` | `StaffController@linkDoctor` | ⏭ | `Not verified in automated test suite` |
| `POST` | `staff/{user}/reset-password` | `tenant.staff.reset_password` | `StaffController@sendPasswordReset` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `staff/{user}/role` | `tenant.staff.role` | `StaffController@updateRole` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `staff/{user}/toggle` | `tenant.staff.toggle` | `StaffController@toggleStatus` | ⏭ | `Not verified in automated test suite` |
| `POST` | `staff/{user}/unlink-doctor` | `tenant.staff.unlink_doctor` | `StaffController@unlinkDoctor` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `subscription` | `tenant.subscription.index` | `SubscriptionBillingController@invoices` | ✅ | `RefundWorkflowTest::test_eligibility_service_handles_duplicate_payment_detection, RefundWorkflowTest::test_super_admin_can_approve_reject_and_process_refund` |
| `GET|HEAD` | `subscription/check-status` | `tenant.subscription.check_status` | `SubscriptionBillingController@checkStatus` | ⏭ | `Not verified in automated test suite` |
| `POST` | `subscription/checkout` | `tenant.subscription.checkout` | `SubscriptionBillingController@createCheckout` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `subscription/inactive` | `tenant.subscription.inactive` | `SubscriptionBillingController@inactive` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `subscription/invoices/{invoice}/receipt` | `tenant.subscription.receipt` | `SubscriptionBillingController@receipt` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `subscription/return` | `tenant.subscription.return` | `SubscriptionBillingController@return` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `subscription/subscribe` | `tenant.subscription.subscribe` | `SubscriptionBillingController@subscribe` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/broadcasting/auth` | `tenant.support.broadcasting.auth` | `SupportBroadcastAuthController@authenticate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations` | `tenant.support.conversations.store` | `SupportChatWidgetController@store` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `support/conversations/{publicId}` | `tenant.support.conversations.show` | `SupportChatWidgetController@show` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/close` | `tenant.support.conversations.close` | `SupportChatWidgetController@close` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/messages` | `tenant.support.conversations.messages.send` | `SupportChatWidgetController@sendMessage` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/read` | `tenant.support.conversations.read` | `SupportChatWidgetController@markRead` | ⏭ | `Not verified in automated test suite` |
| `POST` | `support/conversations/{publicId}/typing` | `tenant.support.conversations.typing` | `SupportChatWidgetController@typing` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `support/status` | `tenant.support.status` | `SupportChatWidgetController@status` | ⏭ | `Not verified in automated test suite` |
| `POST` | `tokens/{token}/cancel` | `tenant.token.cancel` | `ClinicWebsiteController@cancelPublicToken` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `tokens/{token}/status` | `tenant.token.status` | `ClinicWebsiteController@publicTokenStatus` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `website` | `tenant.website` | `ClinicWebsiteController@index` | ✅ | `NavigationTest::test_clinic_admin_can_access_all_navigation_routes, NavigationTest::test_receptionist_can_access_clinical_routes_but_is_forbidden_from_admin_settings` |
| `GET|HEAD` | `website/builder/media` | `tenant.website.builder.media` | `ClinicWebsiteController@listMedia` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/builder/media/upload` | `tenant.website.builder.media.upload` | `ClinicWebsiteController@uploadMedia` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `website/builder/media/{asset}` | `tenant.website.builder.media.delete` | `ClinicWebsiteController@deleteMedia` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `website/builder/media/{asset}` | `tenant.website.builder.media.update` | `ClinicWebsiteController@updateMedia` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `website/builder/{page?}` | `tenant.website.builder` | `ClinicWebsiteController@showBuilder` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/builder/{page}/publish` | `tenant.website.builder.publish` | `ClinicWebsiteController@publishBuilder` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/builder/{page}/revert/{revision}` | `tenant.website.builder.revert` | `ClinicWebsiteController@revertRevision` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `website/builder/{page}/revisions` | `tenant.website.builder.revisions` | `ClinicWebsiteController@listRevisions` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/builder/{page}/save` | `tenant.website.builder.save` | `ClinicWebsiteController@saveBuilder` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `website/kit` | `tenant.website.kit` | `SiteKitController@show` | ✅ | `SiteKitTest::test_kit_defaults_from_theme_when_missing, SiteKitTest::test_admin_can_save_kit` |
| `PUT` | `website/kit` | `tenant.website.kit.update` | `SiteKitController@update` | ✅ | `SiteKitTest::test_kit_defaults_from_theme_when_missing, SiteKitTest::test_admin_can_save_kit` |
| `GET|HEAD` | `website/pages` | `tenant.website.pages.index` | `ClinicPageController@index` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, ClinicPagesTest::test_admin_can_create_blank_page` |
| `POST` | `website/pages` | `tenant.website.pages.store` | `ClinicPageController@store` | ✅ | `FullRouteAuthorizationMatrixQaTest::test_comprehensive_tenant_route_role_matrix, ClinicPagesTest::test_admin_can_create_blank_page` |
| `GET|HEAD` | `website/pages/trash` | `tenant.website.pages.trash` | `ClinicPageController@trash` | ✅ | `ClinicPagesTest::test_soft_delete_and_restore` |
| `POST` | `website/pages/{pageId}/restore` | `tenant.website.pages.restore` | `ClinicPageController@restore` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `website/pages/{page}` | `tenant.website.pages.update` | `ClinicPageController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `website/pages/{page}` | `tenant.website.pages.destroy` | `ClinicPageController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/pages/{page}/duplicate` | `tenant.website.pages.duplicate` | `ClinicPageController@duplicate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/pages/{page}/homepage` | `tenant.website.pages.homepage` | `ClinicPageController@homepage` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/pages/{page}/menu` | `tenant.website.pages.menu` | `ClinicWebsiteController@togglePageMenu` | ⏭ | `Not verified in automated test suite` |
| `POST` | `website/publish` | `tenant.website.publish` | `ClinicWebsiteController@publish` | ✅ | `ClinicWebsiteEditorTest::test_autosave_changes_the_draft_only_until_published, ClinicWebsiteEditorTest::test_section_order_and_visibility_are_persisted` |
| `PUT` | `website/sections` | `tenant.website.sections` | `ClinicWebsiteController@updateSections` | ✅ | `ClinicWebsiteEditorTest::test_autosave_changes_the_draft_only_until_published, ClinicWebsiteEditorTest::test_section_order_and_visibility_are_persisted` |
| `PUT` | `website/seo` | `tenant.website.seo` | `ClinicWebsiteController@updateSeo` | ✅ | `ClinicWebsiteEditorTest::test_seo_settings_can_be_saved` |
| `PUT` | `website/theme` | `tenant.website.theme` | `ClinicWebsiteController@updateTheme` | ⏭ | `Not verified in automated test suite` |

### Super Admin Routes (93)

| Method | URI | Route Name | Action | Status | Evidence (Test / Screenshot / Reason) |
|---|---|---|---|:---:|---|
| `GET|HEAD` | `admin/login` | `admin.login` | `AuthenticatedSessionController@create` | ✅ | `AuthenticationTest::test_demo_credentials_are_only_displayed_in_local_environment` |
| `GET|HEAD` | `super-admin` | `super_admin.dashboard` | `PlatformDashboardController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/admins` | `super_admin.admins.index` | `AdminUserController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/2fa/confirm` | `super_admin.admins.2fa_confirm` | `AdminUserController@confirmTwoFactor` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/2fa/disable` | `super_admin.admins.2fa_disable` | `AdminUserController@disableTwoFactor` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/2fa/recovery-codes` | `super_admin.admins.2fa_recovery_codes` | `AdminUserController@regenerateRecoveryCodes` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/admins/2fa/setup` | `super_admin.admins.2fa_setup` | `AdminUserController@getTwoFactorSetup` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/admins/invitations/{id}` | `super_admin.admins.revoke_invite` | `AdminUserController@revokeInvite` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/invite` | `super_admin.admins.invite` | `AdminUserController@invite` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/sessions/logout-others` | `super_admin.admins.logout_other_sessions` | `AdminUserController@logoutOtherSessions` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/{id}/deactivate` | `super_admin.admins.deactivate` | `AdminUserController@deactivate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/admins/{id}/reactivate` | `super_admin.admins.reactivate` | `AdminUserController@reactivate` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/announcements` | `super_admin.announcements.index` | `AnnouncementManagementController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/announcements` | `super_admin.announcements.store` | `AnnouncementManagementController@store` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/announcements/audience-count` | `super_admin.announcements.audience_count` | `AnnouncementManagementController@audienceCount` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/announcements/test-send` | `super_admin.announcements.test_send` | `AnnouncementManagementController@sendTest` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/announcements/{id}` | `super_admin.announcements.show` | `AnnouncementManagementController@show` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `super-admin/announcements/{id}` | `super_admin.announcements.update` | `AnnouncementManagementController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/announcements/{id}` | `super_admin.announcements.destroy` | `AnnouncementManagementController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/announcements/{id}/cancel` | `super_admin.announcements.cancel` | `AnnouncementManagementController@cancel` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/announcements/{id}/duplicate` | `super_admin.announcements.duplicate` | `AnnouncementManagementController@duplicate` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/announcements/{id}/export` | `super_admin.announcements.export` | `AnnouncementManagementController@export` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/audit-logs` | `super_admin.audit_logs.index` | `PlatformAuditLogController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/audit-logs/export` | `super_admin.audit_logs.export` | `PlatformAuditLogController@export` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/clinics` | `super_admin.clinics.index` | `ClinicManagementController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/clinics/exports/{export}/download` | `super_admin.clinics.export.download` | `ClinicManagementController@downloadExport` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/clinics/{clinicId}` | `super_admin.clinics.show` | `ClinicManagementController@show` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/clinics/{clinicId}` | `super_admin.clinics.destroy` | `ClinicManagementController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/export` | `super_admin.clinics.export` | `ClinicManagementController@requestDataExport` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/extend-trial` | `super_admin.clinics.extend_trial` | `ClinicManagementController@extendTrial` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/impersonate` | `super_admin.clinics.impersonate` | `ClinicManagementController@impersonate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/notes` | `super_admin.clinics.notes.store` | `ClinicManagementController@storeNote` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/reactivate` | `super_admin.clinics.reactivate` | `ClinicManagementController@reactivate` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/reset-password` | `super_admin.clinics.reset_password` | `ClinicManagementController@sendPasswordResetLink` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/restore` | `super_admin.clinics.restore` | `ClinicManagementController@restore` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/clinics/{clinicId}/suspend` | `super_admin.clinics.suspend` | `ClinicManagementController@suspend` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/dashboard` | `` | `PlatformDashboardController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/email-previews` | `super_admin.email_previews.index` | `EmailPreviewController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/email-previews/render` | `super_admin.email_previews.render` | `EmailPreviewController@renderPreview` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/email-previews/send-test` | `super_admin.email_previews.send_test` | `EmailPreviewController@sendTest` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/incidents` | `super_admin.incidents.index` | `PlatformIncidentController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/incidents` | `super_admin.incidents.store` | `PlatformIncidentController@store` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `super-admin/incidents/{incident}` | `super_admin.incidents.update` | `PlatformIncidentController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/incidents/{incident}` | `super_admin.incidents.destroy` | `PlatformIncidentController@destroy` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/leads` | `super_admin.leads.index` | `LeadManagementController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/leads` | `super_admin.leads.store` | `LeadManagementController@store` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `super-admin/leads/{lead}` | `super_admin.leads.update` | `LeadManagementController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/leads/{lead}` | `super_admin.leads.destroy` | `LeadManagementController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/leads/{lead}/convert` | `super_admin.leads.convert` | `LeadManagementController@convertToClinic` | ⏭ | `Not verified in automated test suite` |
| `PATCH` | `super-admin/leads/{lead}/stage` | `super_admin.leads.stage` | `LeadManagementController@updateStage` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/medicines` | `super_admin.medicines` | `MedicineCatalogController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/medicines/review/merge` | `super_admin.medicines.review.merge` | `MedicineCatalogController@merge` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/medicines/review/{type}/{id}/approve` | `super_admin.medicines.review.approve` | `MedicineCatalogController@approve` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/medicines/review/{type}/{id}/reject` | `super_admin.medicines.review.reject` | `MedicineCatalogController@reject` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/medicines/rxterms/import` | `super_admin.medicines.rxterms.import` | `MedicineCatalogController@importRxTerms` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/medicines/rxterms/search` | `super_admin.medicines.rxterms.search` | `MedicineCatalogController@searchRxTerms` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/medicines/{medicine}` | `super_admin.medicines.destroy` | `MedicineCatalogController@destroy` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/messaging` | `super_admin.messaging.index` | `MessagingUsageController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/otp-usage` | `super_admin.otp_usage` | `OtpAnalyticsController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/plans` | `super_admin.plans.index` | `PlanManagementController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/plans` | `super_admin.plans.store` | `PlanManagementController@store` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `super-admin/plans/{plan}` | `super_admin.plans.update` | `PlanManagementController@update` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/plans/{plan}` | `super_admin.plans.destroy` | `PlanManagementController@destroy` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/plans/{plan}/toggle-active` | `super_admin.plans.toggle_active` | `PlanManagementController@toggleActive` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/refunds` | `super_admin.refunds.index` | `RefundManagementController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/refunds/{refundRequest}` | `super_admin.refunds.show` | `RefundManagementController@show` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/refunds/{refundRequest}/approve` | `super_admin.refunds.approve` | `RefundManagementController@approve` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/refunds/{refundRequest}/credit-note` | `super_admin.refunds.credit_note` | `RefundManagementController@downloadCreditNote` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/refunds/{refundRequest}/process` | `super_admin.refunds.process` | `RefundManagementController@process` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/refunds/{refundRequest}/recheck` | `super_admin.refunds.recheck` | `RefundManagementController@recheck` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/refunds/{refundRequest}/reject` | `super_admin.refunds.reject` | `RefundManagementController@reject` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/settings` | `super_admin.settings.index` | `PlatformSettingsController@index` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `super-admin/settings` | `super_admin.settings.update` | `PlatformSettingsController@update` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/subscriptions` | `super_admin.subscriptions` | `SubscriptionManagementController@index` | ✅ | `SubscriptionPaymentTest::test_super_admin_can_manage_subscriptions_and_mark_offline_payments` |
| `POST` | `super-admin/subscriptions/invoices/{invoice}/mark-paid` | `super_admin.subscriptions.mark_paid` | `SubscriptionManagementController@markPaid` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/subscriptions/invoices/{invoice}/remind` | `super_admin.subscriptions.remind` | `SubscriptionManagementController@sendPaymentReminder` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/subscriptions/{subscription}/extend` | `super_admin.subscriptions.extend` | `SubscriptionManagementController@extendPeriod` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/subscriptions/{subscription}/toggle-comp` | `super_admin.subscriptions.toggle_comp` | `SubscriptionManagementController@toggleComp` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/support` | `super_admin.support.index` | `SupportInboxController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/support/canned-replies` | `super_admin.support.canned_replies.store` | `SupportInboxController@storeCannedReply` | ⏭ | `Not verified in automated test suite` |
| `PUT` | `super-admin/support/canned-replies/{reply}` | `super_admin.support.canned_replies.update` | `SupportInboxController@updateCannedReply` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/support/canned-replies/{reply}` | `super_admin.support.canned_replies.destroy` | `SupportInboxController@destroyCannedReply` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/support/conversations/{publicId}/close` | `super_admin.support.close` | `SupportInboxController@close` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/support/conversations/{publicId}/reply` | `super_admin.support.reply` | `SupportInboxController@reply` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/support/conversations/{publicId}/return-ai` | `super_admin.support.return_ai` | `SupportInboxController@returnToAi` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/support/conversations/{publicId}/take-over` | `super_admin.support.take_over` | `SupportInboxController@takeOver` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/support/settings` | `super_admin.support.settings.update` | `SupportInboxController@updateSettings` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `super-admin/system-health` | `super_admin.system_health.index` | `SystemHealthController@index` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/system-health/failed-jobs/flush-all` | `super_admin.system_health.flush_all` | `SystemHealthController@flushAll` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/system-health/failed-jobs/retry-all` | `super_admin.system_health.retry_all` | `SystemHealthController@retryAll` | ⏭ | `Not verified in automated test suite` |
| `DELETE` | `super-admin/system-health/failed-jobs/{id}` | `super_admin.system_health.delete_job` | `SystemHealthController@deleteJob` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/system-health/failed-jobs/{id}/retry` | `super_admin.system_health.retry_job` | `SystemHealthController@retryJob` | ⏭ | `Not verified in automated test suite` |
| `POST` | `super-admin/system-health/run-command` | `super_admin.system_health.run_command` | `SystemHealthController@runCommand` | ⏭ | `Not verified in automated test suite` |

### API Routes (15)

| Method | URI | Route Name | Action | Status | Evidence (Test / Screenshot / Reason) |
|---|---|---|---|:---:|---|
| `GET|HEAD` | `api/announcements/active-banners` | `announcements.active_banners` | `ClinicAnnouncementController@getActiveBanners` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/announcements/active-banners` | `tenant.api.announcements.active_banners` | `ClinicAnnouncementController@getActiveBanners` | ⏭ | `Not verified in automated test suite` |
| `POST` | `api/announcements/mark-all-read` | `tenant.api.announcements.mark_all_read` | `ClinicAnnouncementController@markAllRead` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/announcements/notifications` | `announcements.notifications` | `ClinicAnnouncementController@getNotifications` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/announcements/notifications` | `tenant.api.announcements.notifications` | `ClinicAnnouncementController@getNotifications` | ⏭ | `Not verified in automated test suite` |
| `POST` | `api/announcements/{id}/dismiss` | `announcements.dismiss_banner` | `ClinicAnnouncementController@dismissBanner` | ⏭ | `Not verified in automated test suite` |
| `POST` | `api/announcements/{id}/dismiss` | `tenant.api.announcements.dismiss_banner` | `ClinicAnnouncementController@dismissBanner` | ⏭ | `Not verified in automated test suite` |
| `POST` | `api/announcements/{id}/read` | `announcements.mark_read` | `ClinicAnnouncementController@markRead` | ⏭ | `Not verified in automated test suite` |
| `POST` | `api/announcements/{id}/read` | `tenant.api.announcements.mark_read` | `ClinicAnnouncementController@markRead` | ⏭ | `Not verified in automated test suite` |
| `POST` | `api/leads/request-demo` | `api.leads.request_demo` | `PublicDemoRequestController@store` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/notifications` | `tenant.api.notifications` | `WorkspaceNotificationController@index` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/patients/by-phone` | `tenant.api.patients.by_phone` | `BookingTokenController@findPatientByPhone` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/patients/search` | `tenant.api.patients.search` | `BookingTokenController@searchPatients` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `api/search` | `tenant.api.search` | `WorkspaceSearchController@search` | ⏭ | `Not verified in automated test suite` |
| `GET|HEAD` | `book/api/availability/{slug}` | `tenant.book.availability` | `PublicBookingController@doctorMonthAvailability` | ⏭ | `Not verified in automated test suite` |

### Webhooks (3)

| Method | URI | Route Name | Action | Status | Evidence (Test / Screenshot / Reason) |
|---|---|---|---|:---:|---|
| `POST` | `webhooks/paymentslk` | `webhooks.paymentslk` | `PaymentsLkWebhookController@handle` | ✅ | `BillingCenterTest::test_duplicate_webhook_does_not_send_second_success_email, BillingCenterTest::test_failed_payment_queues_failed_payment_email` |
| `GET|HEAD` | `webhooks/whatsapp` | `webhooks.whatsapp.verify` | `WhatsAppWebhookController@verify` | ✅ | `PhoneVerificationTest::test_whatsapp_webhook_signature_validation, PhoneVerificationTest::test_whatsapp_reverse_verification_matching_code_and_sender_verifies` |
| `POST` | `webhooks/whatsapp` | `webhooks.whatsapp.handle` | `WhatsAppWebhookController@handle` | ✅ | `PhoneVerificationTest::test_whatsapp_webhook_signature_validation, PhoneVerificationTest::test_whatsapp_reverse_verification_matching_code_and_sender_verifies` |

### Mailables (24)

| Mailable Class | Path | Status | Evidence (Screenshot / Test) |
|---|---|:---:|---|
| `FindClinicAccessMail` | `app/Mail/Auth/FindClinicAccessMail.php` | ⏭ | `Not verified in automated test suite` |
| `RegistrationVerificationCodeMail` | `app/Mail/Auth/RegistrationVerificationCodeMail.php` | ⏭ | `Not verified in automated test suite` |
| `ResetPasswordMail` | `app/Mail/Auth/ResetPasswordMail.php` | ✅ | `qa-report/screenshots/emails/auth_reset_password.png` |
| `VerifyEmailMail` | `app/Mail/Auth/VerifyEmailMail.php` | ✅ | `qa-report/screenshots/emails/auth_verify_email.png` |
| `WelcomeClinicMail` | `app/Mail/Auth/WelcomeClinicMail.php` | ✅ | `qa-report/screenshots/emails/auth_welcome_clinic.png` |
| `ClinicReadyMail` | `app/Mail/Clinic/ClinicReadyMail.php` | ✅ | `qa-report/screenshots/emails/clinic_ready.png` |
| `ClinicSetupReminderMail` | `app/Mail/Clinic/ClinicSetupReminderMail.php` | ✅ | `qa-report/screenshots/emails/clinic_setup_reminder.png` |
| `NewDeviceLoginMail` | `app/Mail/Security/NewDeviceLoginMail.php` | ✅ | `qa-report/screenshots/emails/security_new_device_login.png` |
| `TwoFactorEnabledMail` | `app/Mail/Security/TwoFactorEnabledMail.php` | ✅ | `qa-report/screenshots/emails/security_two_factor_enabled.png` |
| `NewRefundRequestAdminMail` | `app/Mail/Subscription/NewRefundRequestAdminMail.php` | ✅ | `qa-report/screenshots/emails/new_refund_request_admin.png` |
| `RefundApprovedMail` | `app/Mail/Subscription/RefundApprovedMail.php` | ✅ | `qa-report/screenshots/emails/refund_approved.png` |
| `RefundCompletedMail` | `app/Mail/Subscription/RefundCompletedMail.php` | ✅ | `qa-report/screenshots/emails/refund_completed.png` |
| `RefundRejectedMail` | `app/Mail/Subscription/RefundRejectedMail.php` | ✅ | `qa-report/screenshots/emails/refund_rejected.png` |
| `RefundRequestReceivedMail` | `app/Mail/Subscription/RefundRequestReceivedMail.php` | ✅ | `qa-report/screenshots/emails/refund_request_received.png` |
| `RefundSlaOverdueAdminMail` | `app/Mail/Subscription/RefundSlaOverdueAdminMail.php` | ⏭ | `Not verified in automated test suite` |
| `SubscriptionCancelledMail` | `app/Mail/Subscription/SubscriptionCancelledMail.php` | ✅ | `qa-report/screenshots/emails/subscription_cancelled.png` |
| `SubscriptionPastDueMail` | `app/Mail/Subscription/SubscriptionPastDueMail.php` | ✅ | `qa-report/screenshots/emails/subscription_past_due.png` |
| `SubscriptionPaymentFailedMail` | `app/Mail/Subscription/SubscriptionPaymentFailedMail.php` | ✅ | `qa-report/screenshots/emails/subscription_payment_failed.png` |
| `SubscriptionPaymentSuccessMail` | `app/Mail/Subscription/SubscriptionPaymentSuccessMail.php` | ✅ | `qa-report/screenshots/emails/subscription_payment_success.png` |
| `SubscriptionPlanChangedMail` | `app/Mail/Subscription/SubscriptionPlanChangedMail.php` | ✅ | `qa-report/screenshots/emails/subscription_plan_changed.png` |
| `SubscriptionRenewalReminderMail` | `app/Mail/Subscription/SubscriptionRenewalReminderMail.php` | ✅ | `qa-report/screenshots/emails/subscription_renewal_reminder.png` |
| `SubscriptionResumedMail` | `app/Mail/Subscription/SubscriptionResumedMail.php` | ✅ | `qa-report/screenshots/emails/subscription_resumed.png` |
| `TrialEndedMail` | `app/Mail/Tenants/TrialEndedMail.php` | ✅ | `qa-report/screenshots/emails/subscription_trial_ended.png` |
| `TrialEndingSoonMail` | `app/Mail/Tenants/TrialEndingSoonMail.php` | ✅ | `qa-report/screenshots/emails/subscription_trial_ending_soon.png` |

### Scheduled & Console Commands (19)

| Command Class | Path | Status | Evidence (Test) |
|---|---|:---:|---|
| `CheckRefundSlasCommand` | `app/Console/Commands/CheckRefundSlasCommand.php` | ⏭ | `Not verified in automated test suite` |
| `CheckSubscriptionExpirations` | `app/Console/Commands/CheckSubscriptionExpirations.php` | ⏭ | `Not verified in automated test suite` |
| `CheckSubscriptionRenewalsCommand` | `app/Console/Commands/CheckSubscriptionRenewalsCommand.php` | ⏭ | `Not verified in automated test suite` |
| `CleanWebsiteDefaultClaims` | `app/Console/Commands/CleanWebsiteDefaultClaims.php` | ⏭ | `Not verified in automated test suite` |
| `CleanupDuplicateSessionsCommand` | `app/Console/Commands/CleanupDuplicateSessionsCommand.php` | ⏭ | `Not verified in automated test suite` |
| `CompExistingTenantsCommand` | `app/Console/Commands/CompExistingTenantsCommand.php` | ⏭ | `Not verified in automated test suite` |
| `GenerateSessionsCommand` | `app/Console/Commands/GenerateSessionsCommand.php` | ⏭ | `Not verified in automated test suite` |
| `GenerateSessionsFromTemplatesCommand` | `app/Console/Commands/GenerateSessionsFromTemplatesCommand.php` | ⏭ | `Not verified in automated test suite` |
| `ImportRxTermsMedicines` | `app/Console/Commands/ImportRxTermsMedicines.php` | ⏭ | `Not verified in automated test suite` |
| `ProcessScheduledAnnouncementsCommand` | `app/Console/Commands/ProcessScheduledAnnouncementsCommand.php` | ⏭ | `Not verified in automated test suite` |
| `ResetTwoFactorCommand` | `app/Console/Commands/ResetTwoFactorCommand.php` | ⏭ | `Not verified in automated test suite` |
| `SeedDemoDataCommand` | `app/Console/Commands/SeedDemoDataCommand.php` | ⏭ | `Not verified in automated test suite` |
| `SendClinicSetupRemindersCommand` | `app/Console/Commands/SendClinicSetupRemindersCommand.php` | ⏭ | `Not verified in automated test suite` |
| `SendSubscriptionRenewalReminders` | `app/Console/Commands/SendSubscriptionRenewalReminders.php` | ⏭ | `Not verified in automated test suite` |
| `SendTestMailCommand` | `app/Console/Commands/SendTestMailCommand.php` | ⏭ | `Not verified in automated test suite` |
| `SendTrialRemindersCommand` | `app/Console/Commands/SendTrialRemindersCommand.php` | ⏭ | `Not verified in automated test suite` |
| `SyncDirectoryCommand` | `app/Console/Commands/SyncDirectoryCommand.php` | ⏭ | `Not verified in automated test suite` |
| `TestOtpCommand` | `app/Console/Commands/TestOtpCommand.php` | ⏭ | `Not verified in automated test suite` |
| `WhatsAppCheckCommand` | `app/Console/Commands/WhatsAppCheckCommand.php` | ⏭ | `Not verified in automated test suite` |

### React Pages (51)

| Page Name | Path | Status | Evidence (Test / Screenshot) |
|---|---|:---:|---|
| `AcceptInvitation` | `resources/js/Pages/Auth/AcceptInvitation.tsx` | ⏭ | `Not verified in automated test suite` |
| `AdminLogin` | `resources/js/Pages/Auth/AdminLogin.tsx` | ⏭ | `Not verified in automated test suite` |
| `ConfirmPassword` | `resources/js/Pages/Auth/ConfirmPassword.tsx` | ⏭ | `Not verified in automated test suite` |
| `ForgotPassword` | `resources/js/Pages/Auth/ForgotPassword.tsx` | ⏭ | `Not verified in automated test suite` |
| `Login` | `resources/js/Pages/Auth/Login.tsx` | ✅ | `qa-report/screenshots/emails/security_new_device_login.png` |
| `Register` | `resources/js/Pages/Auth/Register.tsx` | ⏭ | `Not verified in automated test suite` |
| `RegisterClinic` | `resources/js/Pages/Auth/RegisterClinic.tsx` | ⏭ | `Not verified in automated test suite` |
| `RegisterClinicSuccess` | `resources/js/Pages/Auth/RegisterClinicSuccess.tsx` | ⏭ | `Not verified in automated test suite` |
| `ResetPassword` | `resources/js/Pages/Auth/ResetPassword.tsx` | ⏭ | `Not verified in automated test suite` |
| `TenantLogin` | `resources/js/Pages/Auth/TenantLogin.tsx` | ⏭ | `Not verified in automated test suite` |
| `TwoFactorChallenge` | `resources/js/Pages/Auth/TwoFactorChallenge.tsx` | ⏭ | `Not verified in automated test suite` |
| `VerifyEmail` | `resources/js/Pages/Auth/VerifyEmail.tsx` | ⏭ | `Not verified in automated test suite` |
| `DoctorPayouts` | `resources/js/Pages/Billing/DoctorPayouts.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Billing/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Bookings/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Calendar/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `SuspendedOrExpired` | `resources/js/Pages/Clinic/SuspendedOrExpired.tsx` | ⏭ | `Not verified in automated test suite` |
| `Components` | `resources/js/Pages/Dev/Components.tsx` | ⏭ | `Not verified in automated test suite` |
| `ClinicProfile` | `resources/js/Pages/Directory/ClinicProfile.tsx` | ⏭ | `Not verified in automated test suite` |
| `DoctorProfile` | `resources/js/Pages/Directory/DoctorProfile.tsx` | ⏭ | `Not verified in automated test suite` |
| `Find` | `resources/js/Pages/Directory/Find.tsx` | ✅ | `qa-report/screenshots/emails/auth_find_clinic.png` |
| `Index` | `resources/js/Pages/Doctors/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Patients/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Edit` | `resources/js/Pages/Profile/Edit.tsx` | ⏭ | `Not verified in automated test suite` |
| `BookToken` | `resources/js/Pages/Public/BookToken.tsx` | ⏭ | `Not verified in automated test suite` |
| `BookingStatus` | `resources/js/Pages/Public/BookingStatus.tsx` | ⏭ | `Not verified in automated test suite` |
| `BookingUnavailable` | `resources/js/Pages/Public/BookingUnavailable.tsx` | ⏭ | `Not verified in automated test suite` |
| `ClinicLanding` | `resources/js/Pages/Public/ClinicLanding.tsx` | ⏭ | `Not verified in automated test suite` |
| `NotFound` | `resources/js/Pages/Public/NotFound.tsx` | ⏭ | `Not verified in automated test suite` |
| `Pricing` | `resources/js/Pages/Public/Pricing.tsx` | ✅ | `qa-report/screenshots/public/pricing-desktop-dark.png` |
| `QueueStatus` | `resources/js/Pages/Public/QueueStatus.tsx` | ⏭ | `Not verified in automated test suite` |
| `Today` | `resources/js/Pages/Queue/Today.tsx` | ✅ | `TokenBookingFlowTest::test_timezone_date_filtering_and_date_strip` |
| `Tv` | `resources/js/Pages/Queue/Tv.tsx` | ⏭ | `Not verified in automated test suite` |
| `FeesAndPayouts` | `resources/js/Pages/Settings/FeesAndPayouts.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Settings/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Setup/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Waiting` | `resources/js/Pages/Setup/Waiting.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Staff/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `BillingCenter` | `resources/js/Pages/Subscription/BillingCenter.tsx` | ⏭ | `Not verified in automated test suite` |
| `ChangePlan` | `resources/js/Pages/Subscription/ChangePlan.tsx` | ⏭ | `Not verified in automated test suite` |
| `Inactive` | `resources/js/Pages/Subscription/Inactive.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Subscription/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `Receipt` | `resources/js/Pages/Subscription/Receipt.tsx` | ⏭ | `Not verified in automated test suite` |
| `Return` | `resources/js/Pages/Subscription/Return.tsx` | ⏭ | `Not verified in automated test suite` |
| `Subscribe` | `resources/js/Pages/Subscription/Subscribe.tsx` | ⏭ | `Not verified in automated test suite` |
| `Dashboard` | `resources/js/Pages/SuperAdmin/Dashboard.tsx` | ⏭ | `Not verified in automated test suite` |
| `MedicineCatalog` | `resources/js/Pages/SuperAdmin/MedicineCatalog.tsx` | ⏭ | `Not verified in automated test suite` |
| `OtpUsage` | `resources/js/Pages/SuperAdmin/OtpUsage.tsx` | ⏭ | `Not verified in automated test suite` |
| `Subscriptions` | `resources/js/Pages/SuperAdmin/Subscriptions.tsx` | ⏭ | `Not verified in automated test suite` |
| `Index` | `resources/js/Pages/Website/Index.tsx` | ⏭ | `Not verified in automated test suite` |
| `PageBuilder` | `resources/js/Pages/Website/PageBuilder.tsx` | ⏭ | `Not verified in automated test suite` |


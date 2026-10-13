<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ClinicRegistrationController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\FindClinicController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [ClinicRegistrationController::class, 'create'])
        ->name('register');

    Route::post('register', [ClinicRegistrationController::class, 'store'])
        ->middleware('throttle:10,1');

    Route::post('register/send-code', [ClinicRegistrationController::class, 'sendVerificationCode'])
        ->name('register.send_code');

    Route::post('register/verify-code', [ClinicRegistrationController::class, 'verifyCode'])
        ->name('register.verify_code');

    Route::post('register/resend-code', [ClinicRegistrationController::class, 'resendCode'])
        ->name('register.resend_code');

    Route::get('register/success', [ClinicRegistrationController::class, 'success'])
        ->name('register.success');

    Route::post('check-subdomain', [ClinicRegistrationController::class, 'checkSubdomain'])
        ->middleware('throttle:30,1')
        ->name('subdomain.check');

    Route::post('find-clinic/subdomain', [FindClinicController::class, 'searchSubdomain'])
        ->name('find.clinic.subdomain');

    Route::post('find-clinic/email', [FindClinicController::class, 'searchEmail'])
        ->middleware('throttle:10,1')
        ->name('find.clinic.email');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});

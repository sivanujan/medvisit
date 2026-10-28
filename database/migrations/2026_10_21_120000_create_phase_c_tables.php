<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Platform Settings Table
        if (! Schema::hasTable('platform_settings')) {
            Schema::create('platform_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique()->index();
                $table->json('value')->nullable();
                $table->string('group')->default('general')->index();
                $table->timestamps();
            });
        }

        // 2. Announcements Table
        if (! Schema::hasTable('announcements')) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('title');
                $table->longText('message');
                $table->string('type', 32)->default('info')->index(); // info, update, warning, maintenance, billing
                $table->string('cta_label')->nullable();
                $table->string('cta_url')->nullable();
                $table->string('image_path')->nullable();
                $table->string('audience_type', 32)->default('all'); // all, selected, filtered
                $table->json('target_clinic_ids')->nullable();
                $table->json('target_plans')->nullable();
                $table->json('target_statuses')->nullable();
                $table->json('target_recipient_roles')->nullable(); // clinic_admin, all_staff, doctor
                $table->json('channels'); // in_app, banner, email, sms, whatsapp
                $table->timestamp('banner_start_at')->nullable();
                $table->timestamp('banner_end_at')->nullable();
                $table->boolean('banner_dismissible')->default(true);
                $table->timestamp('scheduled_at')->nullable();
                $table->string('status', 32)->default('draft')->index(); // draft, scheduled, sending, sent, partially_failed, cancelled
                $table->timestamp('sent_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 3. Announcement Recipients / Deliveries Table
        if (! Schema::hasTable('announcement_recipients')) {
            Schema::create('announcement_recipients', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('announcement_id')->constrained('announcements')->cascadeOnDelete();
                $table->string('tenant_id')->nullable()->index();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('email')->nullable()->index();
                $table->string('phone')->nullable();
                $table->string('channel', 32)->index(); // in_app, banner, email, sms, whatsapp
                $table->string('status', 32)->default('pending')->index(); // pending, sent, delivered, failed, read, dismissed, clicked
                $table->text('error_reason')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamp('dismissed_at')->nullable();
                $table->timestamp('clicked_at')->nullable();
                $table->timestamps();

                $table->index(['announcement_id', 'status']);
                $table->index(['tenant_id', 'status']);
                $table->index(['user_id', 'status']);
            });
        }

        // 4. Scheduler Heartbeats Table
        if (! Schema::hasTable('scheduler_heartbeats')) {
            Schema::create('scheduler_heartbeats', function (Blueprint $table) {
                $table->string('command')->primary();
                $table->timestamp('last_started_at')->nullable();
                $table->timestamp('last_finished_at')->nullable()->index();
                $table->integer('duration_ms')->default(0);
                $table->string('status', 32)->default('success');
                $table->text('last_output')->nullable();
                $table->timestamps();
            });
        }

        // 5. Admin Invitations Table
        if (! Schema::hasTable('admin_invitations')) {
            Schema::create('admin_invitations', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('email')->index();
                $table->string('token', 64)->unique();
                $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
                $table->timestamp('expires_at');
                $table->timestamp('accepted_at')->nullable();
                $table->timestamps();
            });
        }

        // 6. Users Table Additions (2FA, announcement mutes, login telemetry)
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'two_factor_secret')) {
                $table->text('two_factor_secret')->nullable()->after('password');
            }
            if (! Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            }
            if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            }
            if (! Schema::hasColumn('users', 'mute_announcement_emails')) {
                $table->boolean('mute_announcement_emails')->default(false)->after('is_active');
            }
            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('mute_announcement_emails');
            }
            if (! Schema::hasColumn('users', 'last_login_ip')) {
                $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
                'mute_announcement_emails',
                'last_login_at',
                'last_login_ip',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::dropIfExists('admin_invitations');
        Schema::dropIfExists('scheduler_heartbeats');
        Schema::dropIfExists('announcement_recipients');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('platform_settings');
    }
};

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
        Schema::create('website_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name', 128);
            $table->string('tagline', 255);
            $table->text('description');
            $table->string('tier', 32)->default('premium'); // 'free' | 'premium'
            $table->unsignedInteger('price_cents')->default(350000); // Default Rs. 3,500
            $table->boolean('is_active')->default(true);
            $table->string('version', 32)->default('1.0.0');
            $table->json('changelog')->nullable();
            $table->json('preview_images')->nullable();
            $table->string('preview_video_url')->nullable();
            $table->json('tags')->nullable();
            $table->json('supports')->nullable(); // ['section_editor', 'page_builder']
            $table->json('definition'); // theme tokens, typography, section variants, animation presets, page builder blocks
            $table->string('min_app_version', 32)->default('1.0.0');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['tier', 'is_active', 'sort_order']);
        });

        Schema::create('template_purchases', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('template_id')->constrained('website_templates')->cascadeOnDelete();
            $table->string('source', 32)->default('purchase'); // 'purchase' | 'plan_included' | 'admin_grant'
            $table->unsignedInteger('price_cents')->default(350000);
            $table->string('version_at_purchase', 32)->default('1.0.0');
            $table->foreignId('invoice_id')->nullable()->constrained('subscription_invoices')->nullOnDelete();
            $table->foreignId('payment_transaction_id')->nullable()->constrained('payment_transactions')->nullOnDelete();
            $table->string('status', 32)->default('pending'); // 'pending' | 'paid' | 'refunded' | 'revoked'
            $table->timestamp('purchased_at')->nullable();
            $table->timestamp('first_published_at')->nullable(); // Critical for Option A refund rule
            $table->timestamp('refunded_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->text('revoked_reason')->nullable();
            $table->foreignId('purchased_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('terms_version', 32)->nullable();
            $table->timestamp('terms_accepted_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['template_id', 'status']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('applied_template_id')->nullable()->after('website_published_at')->constrained('website_templates')->nullOnDelete();
            $table->string('applied_template_version', 32)->nullable()->after('applied_template_id');
            $table->json('previous_template_snapshot')->nullable()->after('applied_template_version');
            $table->timestamp('free_template_changed_at')->nullable()->after('previous_template_snapshot');
            $table->integer('advanced_free_template_override')->nullable()->after('free_template_changed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['applied_template_id']);
            $table->dropColumn([
                'applied_template_id',
                'applied_template_version',
                'previous_template_snapshot',
                'free_template_changed_at',
                'advanced_free_template_override',
            ]);
        });

        Schema::dropIfExists('template_purchases');
        Schema::dropIfExists('website_templates');
    }
};

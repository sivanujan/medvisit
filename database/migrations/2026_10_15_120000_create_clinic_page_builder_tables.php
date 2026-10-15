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
        // 1. Clinic Pages (Versioned schema for Elementor-style builder)
        Schema::create('clinic_pages', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('slug')->default('home');
            $table->string('title')->default('Home');
            $table->unsignedTinyInteger('schema_version')->default(2);
            $table->json('content_json')->nullable();
            $table->longText('html')->nullable();
            $table->longText('css')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->longText('published_html')->nullable();
            $table->longText('published_css')->nullable();
            $table->json('published_json')->nullable();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('theme_preset')->default('medvisit-teal');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'slug']);
        });

        // 2. Clinic Page Revisions (History stack for undo/restore)
        Schema::create('clinic_page_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('page_id')->constrained('clinic_pages')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version_number');
            $table->string('summary')->nullable();
            $table->json('content_json')->nullable();
            $table->longText('html')->nullable();
            $table->longText('css')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'page_id', 'created_at']);
        });

        // 3. Clinic Media Assets (Tenant media library)
        Schema::create('clinic_media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('filename');
            $table->string('original_name');
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('url');
            $table->string('mime_type')->default('image/jpeg');
            $table->unsignedBigInteger('size')->default(0);
            $table->string('dimensions')->nullable();
            $table->string('alt_text')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_media_assets');
        Schema::dropIfExists('clinic_page_revisions');
        Schema::dropIfExists('clinic_pages');
    }
};

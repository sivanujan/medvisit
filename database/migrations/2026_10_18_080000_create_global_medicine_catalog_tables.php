<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Enable pg_trgm extension for fast trigram text matching
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

        // 2. Global Medicines Catalog Table (Central, No BelongsToTenant)
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->string('generic_name');
            $table->string('normalized_name')->index();
            $table->string('route', 50)->default('Oral'); // Oral, Topical, Injection, Ophthalmic, Inhalation, Nasal, Otic, Rectal, Vaginal, Other
            $table->boolean('is_combination')->default(false);
            $table->string('rxterms_sxdg_rxcui', 50)->nullable()->unique();
            $table->string('source', 30)->default('admin'); // rxterms, admin, clinic
            $table->string('status', 30)->default('approved'); // approved, pending, rejected
            $table->string('created_by_tenant_id')->nullable();
            $table->foreign('created_by_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'source']);
        });

        // Trigram GIN index for fast fuzzy searching & partial unique index on approved generic name + route
        DB::statement('CREATE INDEX medicines_normalized_name_trgm_idx ON medicines USING gin (normalized_name gin_trgm_ops);');
        DB::statement("CREATE UNIQUE INDEX medicines_approved_unique_idx ON medicines (normalized_name, route) WHERE status = 'approved' AND deleted_at IS NULL;");

        // 3. Medicine Components (for combination drugs)
        Schema::create('medicine_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained('medicines')->cascadeOnDelete();
            $table->string('ingredient_name');
            $table->unsignedSmallInteger('position')->default(1);
            $table->timestamps();

            $table->index(['medicine_id', 'position']);
        });

        // 4. Medicine Variants (Strength & Dosage Form)
        Schema::create('medicine_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained('medicines')->cascadeOnDelete();
            $table->string('strength_text');
            $table->decimal('strength_value', 10, 3)->nullable();
            $table->string('strength_unit', 30)->nullable();
            $table->string('dosage_form', 50)->default('Tablet');
            $table->string('form_detail', 100)->nullable();
            $table->string('rxcui', 50)->nullable()->unique();
            $table->string('source', 30)->default('admin');
            $table->string('status', 30)->default('approved');
            $table->string('created_by_tenant_id')->nullable();
            $table->foreign('created_by_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->timestamps();

            $table->index(['medicine_id', 'status']);
        });

        // Unique constraint with NULLS NOT DISTINCT (PG 15+)
        DB::statement('ALTER TABLE medicine_variants ADD CONSTRAINT medicine_variants_unique_combo UNIQUE NULLS NOT DISTINCT (medicine_id, strength_text, dosage_form, form_detail);');

        // 5. Medicine Brands
        Schema::create('medicine_brands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_variant_id')->constrained('medicine_variants')->cascadeOnDelete();
            $table->string('brand_name');
            $table->string('manufacturer')->nullable();
            $table->string('country', 100)->nullable();
            $table->string('status', 30)->default('approved');
            $table->string('created_by_tenant_id')->nullable();
            $table->foreign('created_by_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->timestamps();

            $table->index(['medicine_variant_id', 'status']);
        });

        // Trigram GIN index on medicine_brands.brand_name
        DB::statement('CREATE INDEX medicine_brands_brand_name_trgm_idx ON medicine_brands USING gin (brand_name gin_trgm_ops);');

        // 6. Medicine Barcodes
        Schema::create('medicine_barcodes', function (Blueprint $table) {
            $table->id();
            $table->string('barcode')->index();
            $table->foreignId('medicine_brand_id')->constrained('medicine_brands')->cascadeOnDelete();
            $table->unsignedInteger('pack_size')->default(1);
            $table->string('status', 30)->default('approved');
            $table->string('created_by_tenant_id')->nullable();
            $table->foreign('created_by_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->timestamps();

            $table->unique(['barcode', 'medicine_brand_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medicine_barcodes');
        Schema::dropIfExists('medicine_brands');
        Schema::dropIfExists('medicine_variants');
        Schema::dropIfExists('medicine_components');
        Schema::dropIfExists('medicines');
    }
};

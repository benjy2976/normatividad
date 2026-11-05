<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicNormatividadApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('regulations');
        Storage::fake('ocr_cache');
        $this->createDomainSchema();
        $this->seedDomain();
    }

    public function test_public_catalogs_only_return_visible_and_active_records(): void
    {
        $this->getJson('/v1/public/tipos-documento')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.descripcion', 'Resolución');

        $this->getJson('/v1/public/siglas?tipoDocumentoId=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sigla', 'RER');

        $this->getJson('/v1/public/procesos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.codigo', 'E1');
    }

    public function test_document_list_filters_metadata_and_never_returns_unpublished_documents(): void
    {
        $this->getJson('/v1/public/documentos?anio=2026&texto=ejecutiva')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', 100)
            ->assertJsonPath('data.0.tipoDocumento.descripcion', 'Resolución')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath(
                'links.primera',
                '/resources/v1/public/documentos?anio=2026&texto=ejecutiva&pagina=1'
            );

        $this->getJson('/v1/public/documentos/101')->assertNotFound();
    }

    public function test_file_manifest_uses_only_active_registered_artifacts(): void
    {
        Storage::disk('regulations')->put('2026/100/original.pdf', 'original');
        Storage::disk('ocr_cache')->put('2026/100/hash.pdf', 'searchable');
        Storage::disk('ocr_cache')->put('2026/100/hash.jsonl', "{}\n");

        $this->getJson('/v1/public/documentos/100/archivos/200')
            ->assertOk()
            ->assertJsonPath('data.cantidadPaginas', 4)
            ->assertJsonPath('data.representaciones.trusted', true)
            ->assertJsonPath('data.representaciones.defaultRepresentation', 'pdf-searchable')
            ->assertJsonCount(3, 'data.representaciones.representations')
            ->assertJsonMissing(['tipo' => 'markdown']);

        $this->get('/v1/public/documentos/100/archivos/200/representaciones/pdf-searchable')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->getJson('/v1/public/documentos/100/archivos/999')->assertNotFound();
        $this->getJson('/v1/public/documentos/101/archivos/200')->assertNotFound();
    }

    public function test_derived_representations_are_not_exposed_without_the_original(): void
    {
        Storage::disk('ocr_cache')->put('2026/100/hash.pdf', 'searchable');

        $this->getJson('/v1/public/documentos/100/archivos/200')
            ->assertOk()
            ->assertJsonPath('data.representaciones.trusted', false)
            ->assertJsonCount(0, 'data.representaciones.representations');

        $this->getJson('/v1/public/documentos/100/archivos/200/representaciones/pdf-searchable')
            ->assertNotFound();
    }

    private function createDomainSchema(): void
    {
        Schema::create('regulations_tipos', function (Blueprint $table): void {
            $table->id();
            $table->string('tip_description')->nullable();
            $table->integer('tip_show')->default(1);
            $table->integer('tip_show_portal')->default(1);
            $table->integer('tip_uso_obras')->default(0);
            $table->integer('tip_autoincrement')->default(0);
            $table->integer('tip_adenda')->default(0);
            $table->boolean('tip_numeracion_proceso')->default(false);
            $table->boolean('tip_versionado')->default(false);
            $table->timestamps();
        });

        Schema::create('regulation_processes', function (Blueprint $table): void {
            $table->id();
            $table->string('proc_codigo');
            $table->string('proc_descripcion');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('regulations_tipos_siglas', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('regulations_tipo_id')->nullable();
            $table->unsignedBigInteger('process_id')->nullable();
            $table->string('sig_codigo');
            $table->string('sig_name')->nullable();
            $table->string('sig_siglas')->nullable();
            $table->integer('sig_manual')->default(0);
            $table->integer('sig_mostrar')->default(1);
            $table->timestamps();
        });

        Schema::create('regulations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('regulations_tipo');
            $table->unsignedBigInteger('regulations_tipos_sigla_id');
            $table->integer('reg_type_num')->nullable();
            $table->string('reg_title')->nullable();
            $table->integer('reg_ofic')->nullable();
            $table->text('reg_description')->nullable();
            $table->string('reg_observation')->nullable();
            $table->date('reg_date')->nullable();
            $table->integer('reg_status');
            $table->integer('reg_status_file')->default(0);
            $table->string('reg_year')->nullable();
            $table->integer('reg_num');
            $table->integer('admin_idadmin')->nullable();
            $table->integer('reg_proyecto')->nullable();
            $table->unsignedBigInteger('reg_process_id')->nullable();
            $table->integer('reg_correlativo')->nullable();
            $table->string('reg_version')->nullable();
            $table->timestamps();
        });

        Schema::create('regulation_files', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('file_idregulation');
            $table->string('file_ruta');
            $table->integer('file_tomo');
            $table->integer('file_nro_tipo');
            $table->integer('file_status')->default(1);
            $table->integer('file_statusfile')->default(2);
            $table->double('file_size')->default(0);
            $table->string('file_name');
            $table->string('file_type');
            $table->string('file_md5');
            $table->integer('file_user')->default(1);
            $table->timestamps();
        });

        Schema::create('regulation_file_ocrs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('regulation_file_id');
            $table->integer('status')->default(4);
            $table->integer('source_page_count')->nullable();
            $table->boolean('has_pdf')->default(false);
            $table->boolean('has_text')->default(false);
            $table->boolean('has_md')->default(false);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('regulation_file_ocr_artifacts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('regulation_file_id');
            $table->unsignedBigInteger('execution_id')->nullable();
            $table->string('artifact_type');
            $table->string('origin');
            $table->string('status');
            $table->string('storage_disk')->nullable();
            $table->string('storage_path')->nullable();
            $table->string('source_md5')->nullable();
            $table->string('artifact_md5')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('schema_version')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('superseded_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->string('deletion_reason')->nullable();
            $table->timestamps();
        });
    }

    private function seedDomain(): void
    {
        DB::table('regulations_tipos')->insert([
            [
                'id' => 1,
                'tip_description' => 'Resolución',
                'tip_show' => 1,
                'tip_show_portal' => 1,
                'tip_numeracion_proceso' => false,
                'tip_versionado' => false,
            ],
            [
                'id' => 2,
                'tip_description' => 'Interno',
                'tip_show' => 1,
                'tip_show_portal' => 0,
                'tip_numeracion_proceso' => false,
                'tip_versionado' => false,
            ],
        ]);
        DB::table('regulation_processes')->insert([
            ['id' => 1, 'proc_codigo' => 'E1', 'proc_descripcion' => 'Ejecutivo', 'activo' => true],
            ['id' => 2, 'proc_codigo' => 'X1', 'proc_descripcion' => 'Inactivo', 'activo' => false],
        ]);
        DB::table('regulations_tipos_siglas')->insert([
            [
                'id' => 10,
                'regulations_tipo_id' => 1,
                'process_id' => 1,
                'sig_codigo' => 'RER',
                'sig_name' => 'Resolución Ejecutiva Regional',
                'sig_siglas' => 'RER',
                'sig_manual' => 0,
                'sig_mostrar' => 1,
            ],
            [
                'id' => 11,
                'regulations_tipo_id' => 2,
                'process_id' => null,
                'sig_codigo' => 'INT',
                'sig_name' => 'Interna',
                'sig_siglas' => 'INT',
                'sig_manual' => 0,
                'sig_mostrar' => 1,
            ],
        ]);
        DB::table('regulations')->insert([
            [
                'id' => 100,
                'regulations_tipo' => 1,
                'regulations_tipos_sigla_id' => 10,
                'reg_title' => 'Resolución Ejecutiva Regional 528',
                'reg_description' => 'Documento publicado',
                'reg_date' => '2026-10-30',
                'reg_status' => 1,
                'reg_status_file' => 1,
                'reg_year' => '2026',
                'reg_num' => 528,
                'reg_process_id' => 1,
            ],
            [
                'id' => 101,
                'regulations_tipo' => 1,
                'regulations_tipos_sigla_id' => 10,
                'reg_title' => 'Documento oculto',
                'reg_description' => 'No publicable',
                'reg_date' => '2026-10-30',
                'reg_status' => 0,
                'reg_status_file' => 1,
                'reg_year' => '2026',
                'reg_num' => 529,
                'reg_process_id' => 1,
            ],
        ]);
        DB::table('regulation_files')->insert([
            'id' => 200,
            'file_idregulation' => 100,
            'file_ruta' => '2026/100/original.pdf',
            'file_tomo' => 0,
            'file_nro_tipo' => 0,
            'file_status' => 1,
            'file_statusfile' => 2,
            'file_size' => 8,
            'file_name' => 'resolucion-528.pdf',
            'file_type' => 'application/pdf',
            'file_md5' => 'source-hash',
            'file_user' => 1,
        ]);
        DB::table('regulation_file_ocrs')->insert([
            'id' => 300,
            'regulation_file_id' => 200,
            'status' => 4,
            'source_page_count' => 4,
            'has_pdf' => true,
            'has_text' => true,
            'has_md' => true,
        ]);
        DB::table('regulation_file_ocr_artifacts')->insert([
            [
                'id' => 400,
                'regulation_file_id' => 200,
                'artifact_type' => 'pdf',
                'origin' => 'generated',
                'status' => 'active',
                'storage_disk' => 'ocr_cache',
                'storage_path' => '2026/100/hash.pdf',
                'size' => 10,
            ],
            [
                'id' => 401,
                'regulation_file_id' => 200,
                'artifact_type' => 'text',
                'origin' => 'generated',
                'status' => 'active',
                'storage_disk' => 'ocr_cache',
                'storage_path' => '2026/100/hash.jsonl',
                'size' => 3,
            ],
            [
                'id' => 402,
                'regulation_file_id' => 200,
                'artifact_type' => 'md',
                'origin' => 'generated',
                'status' => 'superseded',
                'storage_disk' => 'ocr_cache',
                'storage_path' => '2026/100/hash.md',
                'size' => 4,
            ],
        ]);
    }
}

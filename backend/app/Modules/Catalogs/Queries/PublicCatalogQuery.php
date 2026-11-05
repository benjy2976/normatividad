<?php

namespace App\Modules\Catalogs\Queries;

use App\Modules\Catalogs\Models\DocumentProcess;
use App\Modules\Catalogs\Models\DocumentType;
use App\Modules\Catalogs\Models\DocumentTypeAcronym;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class PublicCatalogQuery
{
    public function paginateDocumentTypes(array $filters): LengthAwarePaginator
    {
        $query = DocumentType::query()->visibleInPortal();
        $this->applyTextFilter($query, 'tip_description', $filters['texto'] ?? null);

        return $query
            ->orderBy('tip_description')
            ->paginate(
                perPage: (int) ($filters['porPagina'] ?? 50),
                pageName: 'pagina',
                page: (int) ($filters['pagina'] ?? 1),
            );
    }

    public function findDocumentType(int $id): ?DocumentType
    {
        return DocumentType::query()->visibleInPortal()->find($id);
    }

    public function paginateAcronyms(array $filters): LengthAwarePaginator
    {
        $query = DocumentTypeAcronym::query()->visible();

        $query->when(
            $filters['tipoDocumentoId'] ?? null,
            fn (Builder $builder, int $id): Builder => $builder->where('regulations_tipo_id', $id),
        );
        $query->when(
            $filters['procesoId'] ?? null,
            fn (Builder $builder, int $id): Builder => $builder->where('process_id', $id),
        );
        $this->applyTextFilter($query, ['sig_codigo', 'sig_name', 'sig_siglas'], $filters['texto'] ?? null);

        return $query
            ->orderBy('sig_codigo')
            ->paginate(
                perPage: (int) ($filters['porPagina'] ?? 50),
                pageName: 'pagina',
                page: (int) ($filters['pagina'] ?? 1),
            );
    }

    public function findAcronym(int $id): ?DocumentTypeAcronym
    {
        return DocumentTypeAcronym::query()->visible()->find($id);
    }

    public function paginateProcesses(array $filters): LengthAwarePaginator
    {
        $query = DocumentProcess::query()->active();
        $this->applyTextFilter($query, ['proc_codigo', 'proc_descripcion'], $filters['texto'] ?? null);

        return $query
            ->orderBy('proc_codigo')
            ->paginate(
                perPage: (int) ($filters['porPagina'] ?? 50),
                pageName: 'pagina',
                page: (int) ($filters['pagina'] ?? 1),
            );
    }

    public function findProcess(int $id): ?DocumentProcess
    {
        return DocumentProcess::query()->active()->find($id);
    }

    private function applyTextFilter(Builder $query, string|array $columns, ?string $text): void
    {
        $text = trim((string) $text);
        if ($text === '') {
            return;
        }

        $columns = (array) $columns;
        $needle = '%'.mb_strtolower($text).'%';
        $query->where(function (Builder $nested) use ($columns, $needle): void {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                $nested->{$method}("LOWER(COALESCE({$column}, '')) LIKE ?", [$needle]);
            }
        });
    }
}

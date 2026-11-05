<?php

namespace App\Modules\Documents\Http\Resources;

use App\Modules\Catalogs\Http\Resources\DocumentProcessResource;
use App\Modules\Catalogs\Http\Resources\DocumentTypeAcronymResource;
use App\Modules\Catalogs\Http\Resources\DocumentTypeResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'titulo' => $this->reg_title,
            'descripcion' => $this->reg_description,
            'observacion' => $this->reg_observation,
            'fecha' => $this->reg_date?->format('Y-m-d'),
            'anio' => $this->reg_year,
            'numero' => (int) $this->reg_num,
            'correlativo' => $this->reg_correlativo !== null ? (int) $this->reg_correlativo : null,
            'version' => $this->reg_version,
            'tipoDocumento' => $this->whenLoaded(
                'documentType',
                fn (): DocumentTypeResource => new DocumentTypeResource($this->documentType),
            ),
            'sigla' => $this->whenLoaded(
                'acronym',
                fn (): ?DocumentTypeAcronymResource => $this->acronym
                    ? new DocumentTypeAcronymResource($this->acronym)
                    : null,
            ),
            'proceso' => $this->whenLoaded(
                'process',
                fn (): ?DocumentProcessResource => $this->process
                    ? new DocumentProcessResource($this->process)
                    : null,
            ),
        ];
    }
}

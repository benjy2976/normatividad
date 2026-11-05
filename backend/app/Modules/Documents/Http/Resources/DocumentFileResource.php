<?php

namespace App\Modules\Documents\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentFileResource extends JsonResource
{
    public function __construct(mixed $resource, private readonly ?array $manifest = null)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'documentoId' => (int) $this->file_idregulation,
            'tomo' => (int) $this->file_tomo,
            'tipoArchivo' => (int) $this->file_nro_tipo,
            'nombre' => $this->file_name,
            'mimeType' => $this->file_type,
            'tamano' => (int) $this->file_size,
            'md5' => $this->file_md5,
            'cantidadPaginas' => $this->whenLoaded(
                'ocrState',
                fn (): ?int => $this->ocrState?->source_page_count,
            ),
            'representaciones' => $this->when(
                $this->manifest !== null,
                $this->manifest,
            ),
        ];
    }
}

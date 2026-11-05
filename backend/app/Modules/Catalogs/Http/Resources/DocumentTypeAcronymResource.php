<?php

namespace App\Modules\Catalogs\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentTypeAcronymResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'tipoDocumentoId' => $this->regulations_tipo_id !== null
                ? (int) $this->regulations_tipo_id
                : null,
            'procesoId' => $this->process_id !== null ? (int) $this->process_id : null,
            'codigo' => $this->sig_codigo,
            'nombre' => $this->sig_name,
            'sigla' => $this->sig_siglas,
            'manual' => (bool) $this->sig_manual,
        ];
    }
}

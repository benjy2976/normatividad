<?php

namespace App\Modules\Catalogs\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'descripcion' => $this->tip_description,
            'usaNumeracionPorProceso' => (bool) $this->tip_numeracion_proceso,
            'permiteVersiones' => (bool) $this->tip_versionado,
            'permiteAdendas' => (bool) $this->tip_adenda,
        ];
    }
}

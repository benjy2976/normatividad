<?php

namespace App\Modules\Catalogs\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentProcessResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'codigo' => $this->proc_codigo,
            'descripcion' => $this->proc_descripcion,
        ];
    }
}

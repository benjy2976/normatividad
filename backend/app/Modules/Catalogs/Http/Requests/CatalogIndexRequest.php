<?php

namespace App\Modules\Catalogs\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CatalogIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'texto' => ['nullable', 'string', 'max:150'],
            'tipoDocumentoId' => ['nullable', 'integer', 'min:1'],
            'procesoId' => ['nullable', 'integer', 'min:1'],
            'pagina' => ['nullable', 'integer', 'min:1'],
            'porPagina' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}

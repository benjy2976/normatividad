<?php

namespace App\Modules\Documents\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DocumentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'texto' => ['nullable', 'string', 'max:250'],
            'tipoDocumentoId' => ['nullable', 'integer', 'min:1'],
            'siglaId' => ['nullable', 'integer', 'min:1'],
            'procesoId' => ['nullable', 'integer', 'min:1'],
            'anio' => ['nullable', 'digits:4'],
            'numero' => ['nullable', 'integer', 'min:0'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
            'orden' => ['nullable', Rule::in(['fechaDesc', 'fechaAsc', 'idDesc'])],
            'pagina' => ['nullable', 'integer', 'min:1'],
            'porPagina' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}

<?php

namespace App\Modules\Documents\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DocumentFileIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pagina' => ['nullable', 'integer', 'min:1'],
            'porPagina' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}

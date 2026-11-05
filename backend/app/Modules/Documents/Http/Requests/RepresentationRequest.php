<?php

namespace App\Modules\Documents\Http\Requests;

use App\Modules\Documents\Enums\RepresentationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RepresentationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['representacion' => $this->route('representation')]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'representacion' => [
                'required',
                Rule::enum(RepresentationType::class),
            ],
            'disposition' => ['nullable', Rule::in(['inline', 'attachment'])],
        ];
    }
}

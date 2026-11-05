<?php

namespace App\Modules\Catalogs\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentTypeAcronym extends Model
{
    protected $table = 'regulations_tipos_siglas';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'sig_manual' => 'boolean',
            'sig_mostrar' => 'boolean',
        ];
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->where('sig_mostrar', 1)
            ->whereHas('documentType', fn (Builder $type): Builder => $type->visibleInPortal());
    }

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'regulations_tipo_id');
    }

    public function process(): BelongsTo
    {
        return $this->belongsTo(DocumentProcess::class, 'process_id');
    }
}

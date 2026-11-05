<?php

namespace App\Modules\Catalogs\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentType extends Model
{
    protected $table = 'regulations_tipos';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'tip_show' => 'boolean',
            'tip_show_portal' => 'boolean',
            'tip_uso_obras' => 'boolean',
            'tip_autoincrement' => 'boolean',
            'tip_adenda' => 'boolean',
            'tip_numeracion_proceso' => 'boolean',
            'tip_versionado' => 'boolean',
        ];
    }

    public function scopeVisibleInPortal(Builder $query): Builder
    {
        return $query->where('tip_show_portal', 1);
    }

    public function acronyms(): HasMany
    {
        return $this->hasMany(DocumentTypeAcronym::class, 'regulations_tipo_id');
    }
}

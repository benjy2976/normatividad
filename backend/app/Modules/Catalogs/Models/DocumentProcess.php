<?php

namespace App\Modules\Catalogs\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DocumentProcess extends Model
{
    protected $table = 'regulation_processes';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('activo', true);
    }
}

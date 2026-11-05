<?php

use App\Modules\Catalogs\Http\Controllers\Public\DocumentProcessController;
use App\Modules\Catalogs\Http\Controllers\Public\DocumentTypeAcronymController;
use App\Modules\Catalogs\Http\Controllers\Public\DocumentTypeController;
use Illuminate\Support\Facades\Route;

Route::get('tipos-documento', [DocumentTypeController::class, 'index'])->name('document-types.index');
Route::get('tipos-documento/{documentType}', [DocumentTypeController::class, 'show'])
    ->whereNumber('documentType')
    ->name('document-types.show');

Route::get('siglas', [DocumentTypeAcronymController::class, 'index'])->name('acronyms.index');
Route::get('siglas/{acronym}', [DocumentTypeAcronymController::class, 'show'])
    ->whereNumber('acronym')
    ->name('acronyms.show');

Route::get('procesos', [DocumentProcessController::class, 'index'])->name('processes.index');
Route::get('procesos/{process}', [DocumentProcessController::class, 'show'])
    ->whereNumber('process')
    ->name('processes.show');

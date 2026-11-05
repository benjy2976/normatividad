<?php

use App\Modules\Documents\Http\Controllers\Public\DocumentController;
use App\Modules\Documents\Http\Controllers\Public\DocumentFileController;
use App\Modules\Documents\Http\Controllers\Public\DocumentRepresentationController;
use Illuminate\Support\Facades\Route;

Route::get('documentos', [DocumentController::class, 'index'])->name('documents.index');
Route::get('documentos/{document}', [DocumentController::class, 'show'])
    ->whereNumber('document')
    ->name('documents.show');
Route::get('documentos/{document}/archivos', [DocumentFileController::class, 'index'])
    ->whereNumber('document')
    ->name('documents.files.index');
Route::get('documentos/{document}/archivos/{file}', [DocumentFileController::class, 'show'])
    ->whereNumber(['document', 'file'])
    ->name('documents.files.show');
Route::get(
    'documentos/{document}/archivos/{file}/representaciones/{representation}',
    [DocumentRepresentationController::class, 'show'],
)
    ->whereNumber(['document', 'file'])
    ->whereIn('representation', ['original', 'pdf-searchable', 'jsonl', 'markdown'])
    ->name('documents.files.representations.show');

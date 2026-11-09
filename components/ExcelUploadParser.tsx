// components/ExcelUploadParser.tsx
'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ExcelUploadParserProps {
  onDataParsed: (data: any[]) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
}

export default function ExcelUploadParser({
  onDataParsed,
  onUploadStart,
  onUploadError,
}: ExcelUploadParserProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core parsing utility logic using the FileReader API
  const parseExcelFile = (file: File) => {
    if (!file) return;

    // Validate that the file is an Excel spreadsheet format
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'xlsx' && fileType !== 'xls') {
      if (onUploadError) onUploadError('Invalid file type. Please upload an .xlsx or .xls spreadsheet report.');
      return;
    }

    setFileName(file.name);
    if (onUploadStart) onUploadStart();

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        // Read the binary workbook file with date-parsing enabled
        const workbook = XLSX.read(data, {
          type: 'binary',
          cellDates: true, // Prevents Excel serialization numbers from breaking date formats
          cellText: false,
        });

        // Target the very first worksheet tab inside the file
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert the structural sheet grid natively into flat JSON objects
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '', // Standardises empty cells into empty strings instead of leaving them undefined
        });

        if (rawJsonData.length === 0) {
          if (onUploadError) onUploadError('The uploaded spreadsheet contains no data rows.');
          return;
        }

        // Pass the extracted dynamic JSON data up to the parent component workspace
        onDataParsed(rawJsonData);
      } catch (err: any) {
        console.error('Workbook processing error:', err);
        if (onUploadError) onUploadError('Failed to parse workbook layout. Ensure the template matches.');
      }
    };

    reader.onerror = () => {
      if (onUploadError) onUploadError('File reading process interrupted.');
    };

    reader.readAsBinaryString(file);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseExcelFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-white'
        }`}
      >
        {/* Hidden File Input Element */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          className="hidden"
        />

        {/* Dynamic Visual Icons */}
        <div className="mb-4 rounded-full bg-white p-3 shadow-sm border border-gray-100 transition-transform group-hover:scale-110">
          <svg
            className={`h-6 w-6 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {fileName ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Selected: {fileName}
            </p>
            <p className="text-xs text-gray-400">Click or drop another file to replace it</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              <span className="text-blue-600 font-semibold group-hover:underline">Click to upload</span> or drag and drop your spreadsheet here
            </p>
            <p className="text-xs text-gray-400">Supports standard telecom report worksheets (.xlsx, .xls)</p>
          </div>
        )}
      </div>
    </div>
  );
}

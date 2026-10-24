import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { GoogleSheetsSyncConfig, OutletId } from '../types/index.ts';
import {
  Sheet,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Link,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const SheetsSyncView: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<GoogleSheetsSyncConfig | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [defaultOutlet, setDefaultOutlet] = useState<OutletId>('gurgaon');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    totalRows: number;
    sampleRows: string[][];
    csvRaw: string;
  } | null>(null);

  // Column mapping
  const [mapping, setMapping] = useState({
    customerName: 'Name',
    mobileNumber: 'Phone',
    whatsAppNumber: 'WhatsApp',
    email: 'Email',
    outlet: 'Outlet',
    requirement: 'Requirement',
    budget: 'Budget',
    preferredDate: 'Date',
    leadSource: 'Source',
    notes: 'Notes',
  });

  const [importResult, setImportResult] = useState<{
    importedCount: number;
    updatedCount: number;
    duplicateCount: number;
    errors: string[];
  } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await api.getSheetsConfig();
      setConfig(res.config);
      setSpreadsheetUrl(res.config.spreadsheetUrl || '');
      if (res.config.columnMapping) {
        setMapping(res.config.columnMapping as any);
      }
    } catch (err) {
      console.error('Error fetching sheets config:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handlePreview = async () => {
    setIsLoading(true);
    setImportResult(null);
    try {
      const res = await api.previewSheetsData(csvContent, spreadsheetUrl);
      setPreviewData(res);
      // Auto match columns
      const headers = res.headers.map((h) => h.toLowerCase());
      const newMap = { ...mapping };
      res.headers.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes('name') || lower.includes('customer')) newMap.customerName = h;
        if (lower.includes('phone') || lower.includes('mobile')) newMap.mobileNumber = h;
        if (lower.includes('whatsapp')) newMap.whatsAppNumber = h;
        if (lower.includes('mail')) newMap.email = h;
        if (lower.includes('outlet') || lower.includes('center') || lower.includes('branch')) newMap.outlet = h;
        if (lower.includes('require') || lower.includes('service') || lower.includes('event')) newMap.requirement = h;
        if (lower.includes('budget') || lower.includes('amount')) newMap.budget = h;
        if (lower.includes('date')) newMap.preferredDate = h;
        if (lower.includes('source') || lower.includes('channel')) newMap.leadSource = h;
      });
      setMapping(newMap);
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData) return;
    setIsLoading(true);
    try {
      const res = await api.importSheetsData(previewData.csvRaw, mapping, defaultOutlet);
      setImportResult(res);
      await fetchConfig();
      alert(`Import completed! ${res.importedCount} new leads imported, ${res.duplicateCount} duplicates resolved.`);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample CSV template loader for instant testing
  const loadSampleCSV = () => {
    const sample = `Name,Phone,WhatsApp,Email,Outlet,Requirement,Budget,Date,Source,Notes
Sunita Rao,9811223344,9811223344,sunita@example.com,Gurgaon,Twin Birthday Party for 20 kids,40000,2026-11-20,Google Ads,Prefers afternoon slot
Karan Varma,9822334455,9822334455,karan.v@domain.com,Faridabad,Trampoline group booking for 15 children,25000,2026-11-22,Website,Looking for food package
Nisha Goel,9833445566,9833445566,nisha@gmail.com,Gurgaon,Soft play area rental,18000,2026-11-28,Meta Ads,Interested in catering options`;
    setCsvContent(sample);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-[#302A28]">Google Sheets Synchronization & Import Wizard</h1>
        <p className="text-xs text-[#7B706B] mt-0.5">
          Connect existing client spreadsheets, map columns, detect duplicates, and schedule automatic sync
        </p>
      </div>

      {/* Sync Status Banner */}
      <div className="p-5 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B706B]">Current Sync Engine Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E8B65] animate-pulse" />
            <span className="font-extrabold text-[#302A28] text-sm">
              Status: {config?.lastSyncStatus === 'success' ? 'Synchronized & Operational' : 'Ready for Sync'}
            </span>
          </div>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Last Sync: {config?.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toLocaleString() : 'Not synced yet'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfig}
            className="px-3 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl text-xs font-semibold text-[#7B706B] hover:text-[#302A28] transition-colors"
          >
            Check Status
          </button>
        </div>
      </div>

      {/* Step 1: Data Source Connection */}
      <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-4">
        <h3 className="font-black text-[#302A28] text-sm flex items-center gap-2">
          <Sheet className="w-4 h-4 text-[#2E8B65]" />
          Step 1: Connect Google Sheet URL or Paste CSV Data
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#302A28] mb-1">
              Google Spreadsheet Published URL or Direct Export Link
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit#gid=0"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:border-[#F4B6A0] focus:outline-hidden"
            />
          </div>

          <div className="text-center text-[#7B706B] font-semibold">— OR PASTE CSV CONTENT DIRECTLY —</div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-[#302A28]">CSV Rows</label>
              <button
                type="button"
                onClick={loadSampleCSV}
                className="text-[11px] text-[#5587C7] hover:underline font-bold"
              >
                Insert Sample Sheet Data
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Paste comma-separated rows with header row..."
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full p-3 font-mono text-[11px] bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="font-semibold text-[#302A28] mr-2">Default Outlet for rows without Center:</label>
              <select
                value={defaultOutlet}
                onChange={(e) => setDefaultOutlet(e.target.value as OutletId)}
                className="p-1.5 bg-white border border-[#F0E4DF] rounded-lg"
              >
                <option value="gurgaon">Gurgaon Center</option>
                <option value="faridabad">Faridabad Center</option>
              </select>
            </div>

            <button
              onClick={handlePreview}
              disabled={isLoading || (!spreadsheetUrl && !csvContent)}
              className="px-5 py-2.5 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Fetching Data...' : 'Preview & Map Columns'}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Column Mapping & Preview */}
      {previewData && (
        <div className="p-6 bg-white border border-[#F0E4DF] rounded-3xl shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0E4DF]">
            <div>
              <h3 className="font-black text-[#302A28] text-sm">Step 2: Map Sheet Columns to CRM Fields</h3>
              <p className="text-xs text-[#7B706B]">
                Found {previewData.totalRows} data rows. Verify which sheet column corresponds to each CRM field.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-[#302A28] mb-1">Customer Name *</label>
              <select
                value={mapping.customerName}
                onChange={(e) => setMapping({ ...mapping, customerName: e.target.value })}
                className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl"
              >
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#302A28] mb-1">Mobile Phone *</label>
              <select
                value={mapping.mobileNumber}
                onChange={(e) => setMapping({ ...mapping, mobileNumber: e.target.value })}
                className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl"
              >
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#302A28] mb-1">Outlet Center</label>
              <select
                value={mapping.outlet}
                onChange={(e) => setMapping({ ...mapping, outlet: e.target.value })}
                className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl"
              >
                <option value="">None (Use default)</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#302A28] mb-1">Requirement / Service</label>
              <select
                value={mapping.requirement}
                onChange={(e) => setMapping({ ...mapping, requirement: e.target.value })}
                className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl"
              >
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Rows Preview */}
          <div className="pt-2">
            <h5 className="font-bold text-[#302A28] text-xs mb-2">Sample Rows Preview (First 5 Rows)</h5>
            <div className="overflow-x-auto border border-[#F0E4DF] rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FFF9F6] text-[#7B706B] font-bold">
                  <tr>
                    {previewData.headers.map((h, i) => (
                      <th key={i} className="p-2 border-r border-[#F0E4DF] last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E4DF]">
                  {previewData.sampleRows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 border-r border-[#F0E4DF] last:border-r-0 font-medium">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 3: Run Import */}
          <div className="pt-3 border-t border-[#F0E4DF] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#2E8B65] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Duplicate phone numbers will be preserved safely without overwriting CRM-managed remarks.</span>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#2E8B65] hover:bg-[#2E8B65]/90 text-white font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {isLoading ? 'Importing Leads...' : 'Execute Import to CRM Leads'}
            </button>
          </div>
        </div>
      )}

      {/* Import Result Stats */}
      {importResult && (
        <div className="p-6 bg-[#EBF7F0] border border-[#2E8B65]/40 rounded-3xl space-y-2 text-xs">
          <h4 className="font-bold text-[#2E8B65] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Import Completed Successfully!
          </h4>
          <p className="text-[#302A28]">
            <strong>{importResult.importedCount}</strong> new leads imported into CRM database.
          </p>
          <p className="text-[#7B706B]">
            <strong>{importResult.duplicateCount}</strong> duplicate rows matched existing phone records and were linked without overwriting status.
          </p>
        </div>
      )}
    </div>
  );
};

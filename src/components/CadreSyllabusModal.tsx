import React from 'react';
import { X, BookOpen, Award, Landmark, Stethoscope } from 'lucide-react';

interface CadreSyllabusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CadreSyllabusModal: React.FC<CadreSyllabusModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-emerald-950 px-6 py-4 border-b border-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Civil Service & Health Practice Examination Curriculum Syllabus
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-800 space-y-1">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-800" />
              <span>Promotional Curriculum Competency Areas</span>
            </div>
            <p className="leading-relaxed">
              This practice simulator prepares candidates for civil service and healthcare promotional evaluations, testing proficiency in administrative guidelines, health systems management, public finance laws, and leadership ethics.
            </p>
          </div>

          {/* Module 1: Grade Level 07 - 10 Core Focus */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-900">
              <Stethoscope className="w-4 h-4 text-emerald-700" />
              <span>Stream 1: Grade Level 07 – 10 (Junior & Mid-Level Professional Staff)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">Public Service Rules (PSR):</span>
                <ul className="space-y-1 text-slate-600 list-disc pl-4">
                  <li>Retirement benchmarks (60 years age / 35 years service)</li>
                  <li>Categories of misconduct vs serious misconduct</li>
                  <li>Queries, written representation (72 hours), and fair hearing</li>
                  <li>Annual, maternity (16 weeks), sick, and casual leave limits</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">Clinical & Cadre Operations:</span>
                <ul className="space-y-1 text-slate-600 list-disc pl-4">
                  <li>Scheme of service entry grades and 3-year maturity period</li>
                  <li>Triage protocols and emergency room prioritization</li>
                  <li>Infection Prevention and Control (IPC) & standard precautions</li>
                  <li>FEFO pharmaceutical inventory management & cold chain</li>
                  <li>Integrated Disease Surveillance and Response (IDSR)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Module 2: Grade Level 12 - 13 Advanced Focus */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-900">
              <Landmark className="w-4 h-4 text-emerald-700" />
              <span>Stream 2: Grade Level 12 – 13 (Senior Management & Directorate Cadres)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">Financial Regulations & Procurement:</span>
                <ul className="space-y-1 text-slate-600 list-disc pl-4">
                  <li>Accounting Officer status of Permanent Secretary</li>
                  <li>Public Procurement Authority competitive tendering procedures</li>
                  <li>Authority to Incur Expenditure (AIE), Imprests, and Virement</li>
                  <li>Contributory Pension Scheme (8% employee + 10% employer)</li>
                  <li>Treasury Single Account (TSA) compliance</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">Health Governance & Strategic Policies:</span>
                <ul className="space-y-1 text-slate-600 list-disc pl-4">
                  <li>Contributory Social Health Scheme & Capitation mechanisms</li>
                  <li>Primary Health Care Under One Roof (PHCUOR) integration</li>
                  <li>Strategic Health Development Planning & Universal Health Coverage</li>
                  <li>Senior Staff Disciplinary Committees (SSDC) & interdictions</li>
                  <li>Task Shifting and Task Sharing (TSTS) health policies</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
};

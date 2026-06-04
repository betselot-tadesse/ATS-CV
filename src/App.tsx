import React, { useState, useEffect, useRef } from 'react';
import { BriefcaseBusiness, FileText, Loader2, Download, CheckCircle2, ChevronRight, PenTool, Mail, Phone, MapPin, Link as LinkIcon, Copy, History, Lightbulb, FileJson, Eye, X, Upload, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import html2pdf from 'html2pdf.js';

type StyleOption = 'Minimalist' | 'Modern' | 'Professional' | 'Tech/Developer';
const STYLES: StyleOption[] = ['Minimalist', 'Modern', 'Professional', 'Tech/Developer'];

interface CVData {
  careerNote?: string;
  personalInfo: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    links: string[];
  };
  summary: string;
  experience: {
    role: string;
    company: string;
    dates: string;
    location: string;
    achievements: string[];
  }[];
  skills: {
    category: string;
    items: {
      name: string;
      level?: string;
    }[];
  }[];
  education: {
    degree: string;
    school: string;
    dates: string;
    details?: string;
  }[];
}

interface ATSScore {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string;
  tips?: string[];
}

interface ResultData {
  cv: CVData;
  atsScore: ATSScore;
}

type ColorOption = 'Indigo' | 'Emerald' | 'Violet' | 'Rose' | 'Slate';
type LayoutOption = 'Standard' | 'Compact' | 'Split';

const COLORS: ColorOption[] = ['Indigo', 'Emerald', 'Violet', 'Rose', 'Slate'];
const LAYOUTS: LayoutOption[] = ['Standard', 'Compact', 'Split'];

interface SavedCV {
  id: string;
  date: number;
  jobDescription: string;
  resume: string;
  style: StyleOption;
  color: ColorOption;
  layout: LayoutOption;
  result: ResultData;
}

interface CareerGap {
  olderRole: string;
  olderDates: string;
  newerRole: string;
  newerDates: string;
  durationMonths: number;
}

const detectGaps = (experiences: CVData['experience']): CareerGap[] => {
  const parseDate = (dStr: string, isEnd: boolean) => {
    const s = dStr.trim();
    if (s.toLowerCase().includes('present') || s.toLowerCase().includes('current')) return new Date();
    const yearMatch = s.match(/^\d{4}$/);
    if (yearMatch) {
      return isEnd ? new Date(parseInt(yearMatch[0]), 11, 31) : new Date(parseInt(yearMatch[0]), 0, 1);
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  const parsed = experiences.map(exp => {
    const parts = exp.dates.split(/-|to|–/i);
    const start = parts.length > 0 ? parseDate(parts[0], false) : null;
    const end = parts.length > 1 ? parseDate(parts[1], true) : (parts.length === 1 ? parseDate(parts[0], true) : null);
    return { ...exp, start, end };
  }).filter(e => e.start && e.end).sort((a, b) => b.start!.getTime() - a.start!.getTime());

  const gaps: CareerGap[] = [];
  for (let i = 0; i < parsed.length - 1; i++) {
    const newer = parsed[i];
    const older = parsed[i+1];
    if (older.end && newer.start) {
      const diffMs = newer.start.getTime() - older.end.getTime();
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.436875);
      if (diffMonths > 3) {
        gaps.push({ olderRole: older.company, olderDates: older.dates, newerRole: newer.company, newerDates: newer.dates, durationMonths: Math.round(diffMonths) });
      }
    }
  }
  return gaps;
};

const DUMMY_CV: CVData = {
  personalInfo: {
    name: 'Jane Doe',
    title: 'Senior Software Engineer',
    email: 'jane@example.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    links: ['linkedin.com/in/janedoe']
  },
  summary: 'A strong engineering professional demonstrating how the chosen style handles layout, typography, and spacing for introductions and overall structure.',
  skills: [
    {
      category: 'Frontend',
      items: [{ name: 'React' }, { name: 'TypeScript' }]
    },
    {
      category: 'Backend',
      items: [{ name: 'Node.js' }, { name: 'System Architecture' }]
    }
  ],
  experience: [
    {
      company: 'Tech Solutions Inc',
      role: 'Lead Engineer',
      dates: '2020 - Present',
      location: 'SF, CA',
      achievements: [
        'Developed scalable architecture for high-traffic applications.',
        'Mentored junior engineers and led code reviews.'
      ]
    }
  ],
  education: [
    {
      school: 'State University',
      degree: 'B.S. Computer Science',
      dates: '2013 - 2017'
    }
  ]
};

const CVRenderer = ({ data, style, color, layout, onRewrite, rewritingIndices, matchedKeywords }: { data: CVData; style: StyleOption; color: ColorOption; layout: LayoutOption; onRewrite?: (expIdx: number, achIdx: number, text: string) => void; rewritingIndices?: { exp: number, ach: number } | null; matchedKeywords?: string[] }) => {
  const cMap: Record<ColorOption, { primary: string; bg: string; border: string; ring: string; icon: string; borderTop: string; textHighlight: string; highlightBg: string }> = {
    Indigo: { primary: 'text-indigo-600', bg: 'bg-indigo-600', border: 'border-indigo-100', ring: 'ring-indigo-200', icon: 'text-indigo-400', borderTop: 'border-indigo-600', textHighlight: 'text-indigo-500', highlightBg: 'bg-indigo-100/60 font-semibold px-0.5 rounded text-indigo-900 border-b border-indigo-200' },
    Emerald: { primary: 'text-emerald-600', bg: 'bg-emerald-600', border: 'border-emerald-100', ring: 'ring-emerald-200', icon: 'text-emerald-400', borderTop: 'border-emerald-600', textHighlight: 'text-emerald-500', highlightBg: 'bg-emerald-100/60 font-semibold px-0.5 rounded text-emerald-900 border-b border-emerald-200' },
    Violet: { primary: 'text-violet-600', bg: 'bg-violet-600', border: 'border-violet-100', ring: 'ring-violet-200', icon: 'text-violet-400', borderTop: 'border-violet-600', textHighlight: 'text-violet-500', highlightBg: 'bg-violet-100/60 font-semibold px-0.5 rounded text-violet-900 border-b border-violet-200' },
    Rose: { primary: 'text-rose-600', bg: 'bg-rose-600', border: 'border-rose-100', ring: 'ring-rose-200', icon: 'text-rose-400', borderTop: 'border-rose-600', textHighlight: 'text-rose-500', highlightBg: 'bg-rose-100/60 font-semibold px-0.5 rounded text-rose-900 border-b border-rose-200' },
    Slate: { primary: 'text-slate-600', bg: 'bg-slate-600', border: 'border-slate-100', ring: 'ring-slate-200', icon: 'text-slate-400', borderTop: 'border-slate-600', textHighlight: 'text-slate-500', highlightBg: 'bg-slate-200/60 font-semibold px-0.5 rounded text-slate-900 border-b border-slate-300' }
  };
  const theme = cMap[color];
  const layoutClass = layout === 'Compact' ? 'text-[0.9em] scale-95 origin-top' : layout === 'Split' ? 'grid grid-cols-2' : '';

  const highlightText = (text: string) => {
    if (!matchedKeywords || matchedKeywords.length === 0 || !text) return text;
    // Sort keywords by length descending so we match longer ones first
    const keywords = [...matchedKeywords].sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      // Check if this part matches any of the keywords (case-insensitive)
      if (keywords.some(k => k.toLowerCase() === part.toLowerCase())) {
         return <span key={i} className={`ats-highlight ${theme.highlightBg}`}>{part}</span>;
      }
      return part;
    });
  };

  if (style === 'Minimalist') {
    return (
      <div className="bg-white text-black p-8 md:p-12 font-sans max-w-4xl mx-auto ring-1 ring-gray-200 shadow-sm print:shadow-none print:ring-0 print:p-0">
        <header className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-4xl font-bold tracking-tight uppercase">{data.personalInfo?.name}</h1>
          <p className="text-xl mt-1 tracking-wider text-gray-700">{data.personalInfo?.title}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-600 font-medium">
            {data.personalInfo?.email && <a href={`mailto:${data.personalInfo.email}`} className="hover:text-black">{data.personalInfo.email}</a>}
            {data.personalInfo?.phone && <a href={`tel:${data.personalInfo.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-black">{data.personalInfo.phone}</a>}
            <span>{data.personalInfo?.location}</span>
            {data.personalInfo?.links?.map((link, i) => (
              <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="hover:text-black">{link}</a>
            ))}
          </div>
        </header>
        
        {data.summary && (
          <section className="mb-8 page-break-avoid">
            <p className="text-base leading-relaxed">{highlightText(data.summary)}</p>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-4">Experience</h2>
          {data.careerNote && (
            <div className="mb-6 p-4 rounded bg-gray-50 border border-gray-200 text-sm text-gray-800 italic">
              <strong>Career Note:</strong> {data.careerNote}
            </div>
          )}
          <div className="space-y-6">
            {data.experience?.map((exp, i) => (
              <div key={i} className="page-break-avoid">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-lg">{exp.role}</h3>
                  <span className="text-sm font-semibold">{exp.dates}</span>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-medium text-gray-700">{exp.company}</span>
                  <span className="text-sm text-gray-500">{exp.location}</span>
                </div>
                <ul className="list-disc list-outside ml-4 space-y-1 text-sm leading-relaxed">
                  {exp.achievements?.map((ach, j) => {
                     const isRewriting = rewritingIndices?.exp === i && rewritingIndices?.ach === j;
                     return (
                     <li key={j} className="group relative">
                       <span>{highlightText(ach)}</span>
                       {onRewrite && (
                         <button onClick={() => onRewrite(i, j, ach)} disabled={isRewriting} className="print:hidden ml-2 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 align-middle">
                           {isRewriting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                           {isRewriting ? 'Rewriting' : 'Rewrite'}
                         </button>
                       )}
                     </li>
                     );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
           <section className="page-break-avoid">
            <h2 className="text-lg font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-4">Education</h2>
            <div className="space-y-4">
              {data.education?.map((edu, i) => (
                <div key={i} className="page-break-avoid">
                  <h3 className="font-bold">{edu.degree}</h3>
                  <p className="font-medium text-gray-700">{edu.school}</p>
                  <p className="text-sm text-gray-500">{edu.dates}</p>
                  {edu.details && <p className="text-sm mt-1">{edu.details}</p>}
                </div>
              ))}
            </div>
           </section>
           
           <section className="page-break-avoid">
            <h2 className="text-lg font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-4">Skills</h2>
            <div className="space-y-3">
              {data.skills?.map((skill, i) => (
                <div key={i} className="page-break-avoid">
                  <h3 className="font-semibold text-sm uppercase text-gray-800">{skill.category}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {skill.items?.map((item, j) => (
                      <span key={j} className="text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                        {highlightText(item.name)} {item.level && <span className="text-xs text-gray-400">({item.level})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
           </section>
        </div>
      </div>
    );
  }

  if (style === 'Modern') {
    return (
      <div className={`bg-white text-gray-900 border border-gray-100 rounded-xl overflow-hidden shadow-lg print:shadow-none print:border-none max-w-4xl mx-auto flex flex-col md:flex-row print:flex-row min-h-[1056px] ${layoutClass}`}>
        {/* Left Column (Sidebar) */}
        <div className={`bg-slate-50 w-full ${layout === 'Split' ? 'md:w-1/2 print:w-1/2' : 'md:w-1/3 print:w-1/3'} p-8 border-r border-slate-200 print:bg-slate-50`}>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">{data.personalInfo?.name}</h1>
            <p className={`${theme.primary} font-semibold mt-2 text-lg`}>{data.personalInfo?.title}</p>
          </div>
          
          <div className="space-y-4 mb-10 text-sm text-slate-600">
            {data.personalInfo?.email && <a href={`mailto:${data.personalInfo.email}`} className="flex items-center gap-3 hover:text-slate-900"><Mail className={`w-4 h-4 ${theme.icon}`} /> {data.personalInfo.email}</a>}
            {data.personalInfo?.phone && <a href={`tel:${data.personalInfo.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-3 hover:text-slate-900"><Phone className={`w-4 h-4 ${theme.icon}`} /> {data.personalInfo.phone}</a>}
            <div className="flex items-center gap-3"><MapPin className={`w-4 h-4 ${theme.icon}`} /> {data.personalInfo?.location}</div>
            {data.personalInfo?.links?.map((link, i) => (
              <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-slate-900"><LinkIcon className={`w-4 h-4 ${theme.icon}`} /> {link}</a>
            ))}
          </div>

          <div className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Skills</h2>
            <div className="space-y-5">
              {data.skills?.map((skill, i) => (
                <div key={i} className="page-break-avoid">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">{skill.category}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.items?.map((item, j) => {
                      const levels = { 'Beginner': 20, 'Intermediate': 50, 'Advanced': 75, 'Expert': 90, 'Certified': 100 };
                      const pct = item.level ? levels[item.level as keyof typeof levels] || 50 : 0;
                      return (
                        <div key={j} className="bg-white border border-slate-200 w-full text-slate-600 px-3 py-2 rounded-lg text-xs font-medium print:border-slate-300">
                          <div className="flex justify-between items-center mb-1">
                            <span>{highlightText(item.name)}</span>
                            {item.level && <span className={`text-[10px] uppercase ${theme.textHighlight} font-bold`}>{item.level}</span>}
                          </div>
                          {item.level && (
                            <div className="w-full bg-slate-100 h-1.5 mt-1 rounded-full overflow-hidden print:bg-slate-200">
                              <div className={`${theme.bg} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Education</h2>
            <div className="space-y-4">
              {data.education?.map((edu, i) => (
                <div key={i} className="text-sm page-break-avoid">
                  <h3 className="font-semibold text-slate-800">{edu.degree}</h3>
                  <p className="text-slate-600">{edu.school}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{edu.dates}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Main content) */}
        <div className={`w-full ${layout === 'Split' ? 'md:w-1/2 print:w-1/2' : 'md:w-2/3 print:w-2/3'} p-8 md:p-10 bg-white`}>
          {data.summary && (
            <div className="mb-10 page-break-avoid">
              <h2 className={`text-xl font-bold text-slate-900 border-b-2 ${theme.border} pb-2 mb-4 inline-block`}>Profile</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{highlightText(data.summary)}</p>
            </div>
          )}

          <div>
            <h2 className={`text-xl font-bold text-slate-900 border-b-2 ${theme.border} pb-2 mb-6 inline-block`}>Experience</h2>
            {data.careerNote && (
              <div className="mb-8 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                <strong>Career Note:</strong> {data.careerNote}
              </div>
            )}
            <div className="space-y-8">
              {data.experience?.map((exp, i) => (
                <div key={i} className="relative page-break-avoid">
                  {/* Timeline dot */}
                  <div className={`hidden md:block print:block absolute -left-10 top-1.5 w-2.5 h-2.5 rounded-full ${theme.bg} ring-4 ring-white`}></div>
                  
                  <div className="mb-2">
                    <h3 className="text-lg font-bold text-slate-800">{exp.role}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm mt-0.5 gap-1 sm:gap-0">
                      <span className={`font-medium ${theme.primary}`}>{exp.company} <span className="text-slate-400 font-normal mx-1">•</span> <span className="text-slate-500 font-normal">{exp.location}</span></span>
                      <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-medium text-xs whitespace-nowrap">{exp.dates}</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mt-4 text-sm text-slate-600 leading-relaxed">
                    {exp.achievements?.map((ach, j) => {
                       const isRewriting = rewritingIndices?.exp === i && rewritingIndices?.ach === j;
                       return (
                       <li key={j} className="flex gap-2 group relative">
                         <span className={`${theme.icon} mt-1 flex-shrink-0`}>▹</span>
                         <span>{highlightText(ach)}</span>
                         {onRewrite && (
                           <button onClick={() => onRewrite(i, j, ach)} disabled={isRewriting} className="print:hidden ml-2 flex-shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                             {isRewriting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                             {isRewriting ? 'Rewriting' : 'Rewrite'}
                           </button>
                         )}
                       </li>
                       );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'Professional') {
    return (
      <div className="bg-white text-gray-900 p-8 md:p-12 font-serif max-w-4xl mx-auto shadow-sm ring-1 ring-gray-300 print:shadow-none print:ring-0 print:p-0">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{data.personalInfo?.name}</h1>
          <p className="text-lg text-gray-700 italic mt-1">{data.personalInfo?.title}</p>
          <div className="mt-4 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-sm text-gray-600">
             <span>{data.personalInfo?.location}</span>
             <span>•</span>
             {data.personalInfo?.phone && <a href={`tel:${data.personalInfo.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-black">{data.personalInfo.phone}</a>}
             <span>•</span>
             {data.personalInfo?.email && <a href={`mailto:${data.personalInfo.email}`} className="hover:text-black">{data.personalInfo.email}</a>}
             {data.personalInfo?.links?.map((link, i) => (
                <React.Fragment key={i}>
                  <span>•</span>
                  <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="hover:text-black">{link}</a>
                </React.Fragment>
             ))}
          </div>
        </header>

        {data.summary && (
          <section className="mb-6 page-break-avoid">
            <p className="text-justify text-sm leading-relaxed text-gray-800">{highlightText(data.summary)}</p>
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-900 pb-1 mb-4 text-center">Professional Experience</h2>
          {data.careerNote && (
            <div className="mb-6 mx-auto max-w-2xl text-center text-sm text-gray-700 italic border-y border-gray-200 py-2">
              <strong>Note:</strong> {data.careerNote}
            </div>
          )}
          <div className="space-y-5">
             {data.experience?.map((exp, i) => (
                <div key={i} className="page-break-avoid">
                  <div className="flex justify-between items-end mb-1">
                    <h3 className="font-bold text-gray-900">{exp.company}</h3>
                    <span className="font-semibold text-gray-900 text-sm">{exp.location}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-2 italic text-sm text-gray-800">
                    <span>{exp.role}</span>
                    <span>{exp.dates}</span>
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1 text-gray-700 leading-relaxed text-justify">
                    {exp.achievements?.map((ach, j) => {
                       const isRewriting = rewritingIndices?.exp === i && rewritingIndices?.ach === j;
                       return (
                       <li key={j} className="group relative">
                         <span className="-ml-1">{highlightText(ach)}</span>
                         {onRewrite && (
                           <button onClick={() => onRewrite(i, j, ach)} disabled={isRewriting} className="print:hidden ml-2 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 border border-gray-300 hover:bg-gray-50 bg-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 align-middle">
                             {isRewriting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                             {isRewriting ? 'Rewriting' : 'Action Verbs'}
                           </button>
                         )}
                       </li>
                       );
                    })}
                  </ul>
                </div>
             ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-900 pb-1 mb-4 text-center">Education</h2>
          <div className="space-y-3">
             {data.education?.map((edu, i) => (
                <div key={i} className="flex justify-between items-baseline text-sm page-break-avoid">
                  <div>
                    <span className="font-bold text-gray-900">{edu.school}</span>
                    <span className="text-gray-800"> — {edu.degree}</span>
                  </div>
                  <span className="italic text-gray-700">{edu.dates}</span>
                </div>
             ))}
          </div>
        </section>

        <section className="page-break-avoid">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-900 pb-1 mb-4 text-center">Skills & Competencies</h2>
          <div className="text-sm text-gray-800 space-y-2">
             {data.skills?.map((skill, i) => (
                <div key={i} className="flex gap-2 page-break-avoid">
                  <strong className="font-bold flex-shrink-0">{skill.category}: </strong>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.items?.map((it, j) => (
                      <span key={j}>
                        {highlightText(it.name)}{it.level ? <span className="text-xs text-gray-500 italic"> ({it.level})</span> : ''}{j < (skill.items?.length || 0) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
             ))}
          </div>
        </section>
      </div>
    );
  }

  // Tech/Developer
  return (
    <div className="bg-[#0D1117] text-[#C9D1D9] p-8 md:p-12 font-mono max-w-4xl mx-auto shadow-2xl rounded-lg border border-[#30363D] print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
      <header className="border-b border-[#21262D] print:border-gray-200 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-[#58A6FF] print:text-blue-700">{data.personalInfo?.name}</h1>
        <p className="text-[#8B949E] print:text-gray-600 mt-2 text-sm">{">"} {data.personalInfo?.title}</p>
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6 text-sm text-[#8B949E] print:text-gray-600">
           {data.personalInfo?.email && <a href={`mailto:${data.personalInfo.email}`} className="flex items-center gap-2 hover:text-[#C9D1D9] print:hover:text-black"><Mail className="w-3.5 h-3.5" />{data.personalInfo.email}</a>}
           {data.personalInfo?.phone && <a href={`tel:${data.personalInfo.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2 hover:text-[#C9D1D9] print:hover:text-black"><Phone className="w-3.5 h-3.5" />{data.personalInfo.phone}</a>}
           {data.personalInfo?.links?.map((link, i) => (
             <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#C9D1D9] print:hover:text-black"><LinkIcon className="w-3.5 h-3.5" />{link}</a>
           ))}
           <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{data.personalInfo?.location}</span>
        </div>
      </header>

      {data.summary && (
        <section className="mb-10 page-break-avoid">
          <p className="text-sm leading-relaxed text-[#C9D1D9] print:text-gray-800">
             <span className="text-[#7EE787] print:text-green-600">const</span> <span className="text-[#79C0FF] print:text-blue-500">summary</span> = <span className="text-[#A5D6FF] print:text-gray-700">`{highlightText(data.summary)}`</span>;
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 print:grid-cols-3">
         <div className="md:col-span-2 space-y-10">
            <section>
              <h2 className="text-[#58A6FF] print:text-blue-700 font-bold mb-6 flex items-center gap-2">
                <span className="text-[#8B949E] print:text-gray-400">~/</span> experience
              </h2>
              {data.careerNote && (
                <div className="mb-6 p-4 rounded-md bg-[#21262D] print:bg-gray-100 border border-[#30363D] print:border-gray-200 text-sm text-[#8B949E] print:text-gray-700 font-mono">
                  &gt; <span className="text-[#79C0FF] print:text-blue-600">note</span>: {data.careerNote}
                </div>
              )}
              <div className="space-y-8 border-l border-[#30363D] print:border-gray-300 pl-4 print:pl-6 ml-2">
                {data.experience?.map((exp, i) => (
                  <div key={i} className="relative page-break-avoid">
                    <div className="absolute w-2 h-2 bg-[#8B949E] print:bg-gray-400 rounded-full -left-5 print:-left-7 top-1.5 hidden md:block print:block"></div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-2 gap-1 sm:gap-0">
                      <h3 className="font-bold text-[#E6EDF3] print:text-black">{exp.role} <span className="text-[#8B949E] print:text-gray-500 font-normal">@ {exp.company}</span></h3>
                      <span className="text-xs text-[#8B949E] print:text-gray-500 bg-[#21262D] print:bg-gray-100 px-2 py-0.5 rounded">{exp.dates}</span>
                    </div>
                    <ul className="text-sm space-y-2 text-[#8B949E] print:text-gray-700 leading-relaxed mt-4">
                      {exp.achievements?.map((ach, j) => {
                        const isRewriting = rewritingIndices?.exp === i && rewritingIndices?.ach === j;
                        return (
                        <li key={j} className="flex gap-2 group relative">
                           <span className="text-[#7EE787] print:text-green-600">»</span>
                           <span>{highlightText(ach)}</span>
                           {onRewrite && (
                             <button onClick={() => onRewrite(i, j, ach)} disabled={isRewriting} className="print:hidden ml-2 flex-shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-[#79C0FF] hover:text-white bg-[#21262D] hover:bg-[#30363D] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                               {isRewriting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                               {isRewriting ? '...' : 'Rewrite()'}
                             </button>
                           )}
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
         </div>

         <div className="space-y-10">
            <section>
              <h2 className="text-[#58A6FF] print:text-blue-700 font-bold mb-6 flex items-center gap-2">
                <span className="text-[#8B949E] print:text-gray-400">~/</span> tech_stack
              </h2>
              <div className="space-y-6">
                 {data.skills?.map((skill, i) => (
                    <div key={i} className="page-break-avoid">
                      <h3 className="text-xs text-[#E6EDF3] print:text-black font-bold uppercase tracking-wider mb-3">{skill.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {skill.items?.map((item, j) => (
                           <div key={j} className="flex flex-col text-xs bg-[#21262D] print:bg-gray-100 text-[#79C0FF] print:text-blue-600 border border-[#30363D] print:border-gray-300 px-2.5 py-1 rounded-md">
                             <span className="font-semibold">{highlightText(item.name)}</span>
                             {item.level && <span className="text-[10px] text-[#8B949E] print:text-gray-500 mt-0.5">{item.level}</span>}
                           </div>
                        ))}
                      </div>
                    </div>
                 ))}
              </div>
            </section>

            <section>
              <h2 className="text-[#58A6FF] print:text-blue-700 font-bold mb-6 flex items-center gap-2">
                <span className="text-[#8B949E] print:text-gray-400">~/</span> education
              </h2>
              <div className="space-y-4">
                 {data.education?.map((edu, i) => (
                    <div key={i} className="text-sm page-break-avoid">
                      <div className="font-bold text-[#E6EDF3] print:text-black mb-1">{edu.degree}</div>
                      <div className="text-[#8B949E] print:text-gray-600">{edu.school}</div>
                      <div className="text-xs text-[#8B949E] print:text-gray-500 mt-1">[{edu.dates}]</div>
                    </div>
                 ))}
              </div>
            </section>
         </div>
      </div>
    </div>
  );
};

export default function App() {
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [style, setStyle] = useState<StyleOption>('Modern');
  const [colorOption, setColorOption] = useState<ColorOption>('Indigo');
  const [layoutOption, setLayoutOption] = useState<LayoutOption>('Standard');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedCV[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [rewritingIndices, setRewritingIndices] = useState<{exp: number, ach: number} | null>(null);
  const [careerGaps, setCareerGaps] = useState<CareerGap[]>([]);
  const [careerNoteInput, setCareerNoteInput] = useState('');
  const [companyName, setCompanyName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cv_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (result?.cv?.experience) {
      setCareerGaps(detectGaps(result.cv.experience));
      setCareerNoteInput(result.cv.careerNote || '');
    } else {
      setCareerGaps([]);
      setCareerNoteInput('');
    }
  }, [result?.cv?.experience, result?.cv?.careerNote]);

  const handleUpdateCareerNote = (text: string) => {
    setCareerNoteInput(text);
    if (result) {
      setResult(prev => {
        if (!prev) return prev;
        return { ...prev, cv: { ...prev.cv, careerNote: text } };
      });
    }
  };

  const handleReorderAchievements = () => {
    if (!result || !result.atsScore.matchedKeywords) return;
    
    const keywords = result.atsScore.matchedKeywords.map(k => k.toLowerCase());
    
    setResult(prev => {
      if (!prev) return prev;
      const newCv = { ...prev.cv };
      newCv.experience = newCv.experience.map(exp => {
        if (!exp.achievements) return exp;
        
        const scoredAchievements = exp.achievements.map(ach => {
          const achLower = ach.toLowerCase();
          let score = 0;
          keywords.forEach(kw => {
            if (achLower.includes(kw)) {
               score += 1;
            }
          });
          return { ach, score };
        });
        
        scoredAchievements.sort((a, b) => b.score - a.score);
        
        return {
          ...exp,
          achievements: scoredAchievements.map(s => s.ach)
        };
      });
      return { ...prev, cv: newCv };
    });
  };

  const saveToHistory = (newResult: ResultData, jd: string, res: string, st: StyleOption, col: ColorOption, lay: LayoutOption) => {
    const newItem: SavedCV = {
      id: Date.now().toString(),
      date: Date.now(),
      jobDescription: jd,
      resume: res,
      style: st,
      color: col,
      layout: lay,
      result: newResult,
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 10);
      localStorage.setItem('cv_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRewriteAchievement = async (expIndex: number, achIndex: number, oldText: string) => {
    if (!result) return;
    setRewritingIndices({ exp: expIndex, ach: achIndex });
    try {
      const response = await fetch('/api/rewrite-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: oldText }),
      });
      let data;
      const textResponse = await response.text();
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        if (!response.ok) throw new Error(`Rewriting failed: The server returned an error.`);
        throw new Error('Failed to parse AI response as JSON.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to rewrite');

      const newResult = { ...result };
      newResult.cv = { ...newResult.cv };
      newResult.cv.experience = [...newResult.cv.experience];
      newResult.cv.experience[expIndex] = { ...newResult.cv.experience[expIndex] };
      newResult.cv.experience[expIndex].achievements = [...newResult.cv.experience[expIndex].achievements];
      newResult.cv.experience[expIndex].achievements[achIndex] = data.result;

      setResult(newResult);
      
      setHistory((prev) => {
        if (prev.length > 0) {
          const updated = [...prev];
          updated[0] = { ...updated[0], result: newResult };
          localStorage.setItem('cv_history', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    } catch (err: any) {
      alert('Rewrite failed: ' + err.message);
    } finally {
      setRewritingIndices(null);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setIsUploadingPdf(true);
    const formData = new FormData();
    formData.append('resumePdf', file);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      let data;
      const textResponse = await response.text();
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        if (!response.ok) throw new Error(`Upload failed. The file might be too large or the server encountered an error.`);
        throw new Error('Failed to parse server response.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF');
      }

      setResume(data.text);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.cv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tailored_CV_${style}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    if (!result) return;
    const cv = result.cv;
    const text = `
${cv.personalInfo.name}
${cv.personalInfo.title}
${cv.personalInfo.email} | ${cv.personalInfo.phone} | ${cv.personalInfo.location}
${cv.personalInfo.links.join(' | ')}

SUMMARY
${cv.summary}

EXPERIENCE
${cv.experience.map(e => `${e.role} at ${e.company} | ${e.dates} | ${e.location}\n${e.achievements.map(a => `- ${a}`).join('\n')}`).join('\n\n')}

SKILLS
${cv.skills.map(s => `${s.category}: ${s.items.map(it => `${it.name}${it.level ? ` (${it.level})` : ''}`).join(', ')}`).join('\n')}

EDUCATION
${cv.education.map(e => `${e.degree} at ${e.school} | ${e.dates}\n${e.details || ''}`).join('\n\n')}
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      alert('CV copied to clipboard!');
    } catch (err) {
      alert('Failed to copy text.');
    }
  };

  const handleOptimize = async () => {
    if (!jobDescription || !resume) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/optimize-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription, resume, style }),
      });

      let data;
      const textResponse = await response.text();
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        if (!response.ok) throw new Error(`Optimization failed: The request was too large or the server returned an error.`);
        throw new Error('Failed to parse AI response as JSON.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize CV');
      }

      setResult(data.result);
      saveToHistory(data.result, jobDescription, resume, style, colorOption, layoutOption);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('cv-to-print') || document.getElementById('cv-to-print-main');
    if (!element) return;

    const baseName = result?.cv.personalInfo.name.replace(/\s+/g, '_') || 'Resume';
    const finalFilename = companyName.trim() ? `${companyName.trim().replace(/\s+/g, '_')}_Resume.pdf` : `${baseName}.pdf`;

    const opt = {
      margin: 0,
      filename: finalFilename,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { 
        scale: 4, 
        useCORS: true,
        onclone: (doc: Document) => {
          const highlights = doc.querySelectorAll('.ats-highlight');
          highlights.forEach((el) => {
            el.className = '';
          });
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: 'css', avoid: ['.page-break-avoid', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', '.group', '.break-inside-avoid'] },
      enableLinks: true
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm ring-1 ring-indigo-500/50">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">ATS CV Tailor</h1>
          </div>
          {result && (
            <button
              onClick={() => setResult(null)}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Input Form Column */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Tailor your resume</h2>
                <p className="text-gray-500 text-lg max-w-md">Provide your details to generate a highly tailored, beautifully crafted CV engineered to pass ATS scans and impress recruiters.</p>
              </div>

              {/* Job Description Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600 focus-within:border-transparent transition-all">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
                  <BriefcaseBusiness className="w-4 h-4 text-gray-500" />
                  <label htmlFor="jd" className="text-sm font-bold text-gray-700">Target Job Description</label>
                </div>
                <textarea
                  id="jd"
                  className="w-full p-5 h-56 resize-none focus:outline-none text-gray-800 text-sm placeholder:text-gray-400 bg-transparent"
                  placeholder="Paste the target job description requirements here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  spellCheck={false}
                />
              </div>

              {/* Current Resume Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600 focus-within:border-transparent transition-all">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <label htmlFor="resume" className="text-sm font-bold text-gray-700">Current Resume Profile</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      ref={fileInputRef}
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
                    >
                      {isUploadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {isUploadingPdf ? 'Uploading...' : 'Upload PDF'}
                    </label>
                  </div>
                </div>
                <textarea
                  id="resume"
                  className="w-full p-5 h-56 resize-none focus:outline-none text-gray-800 text-sm placeholder:text-gray-400 bg-transparent"
                  placeholder="Paste your current resume content, or upload a PDF..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  spellCheck={false}
                />
                
                {resume && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Detected extracted sections:</span>
                    {(() => {
                      const lower = resume.toLowerCase();
                      const detected = [];
                      if (/\b(experience|work history|employment)\b/i.test(resume)) detected.push('Experience');
                      if (/\b(education|academic|qualifications)\b/i.test(resume)) detected.push('Education');
                      if (/\b(skills|technologies|core competencies)\b/i.test(resume)) detected.push('Skills');
                      if (/\b(projects|portfolio)\b/i.test(resume)) detected.push('Projects');
                      if (/\b(summary|profile|about me)\b/i.test(resume)) detected.push('Summary');
                      
                      if (detected.length === 0) {
                        return <span className="text-xs text-gray-400 italic">None detected</span>;
                      }
                      
                      return detected.map((sec, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {sec}
                        </span>
                      ));
                    })()}
                  </div>
                )}
              </div>

            </div>

            {/* Config & Action Column */}
            <div className="lg:pl-8 space-y-6 flex flex-col items-stretch">
               <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <PenTool className="w-5 h-5 text-indigo-600" />
                    Presentation Configuration
                 </h3>
                 
                 <div className="mb-8">
                   <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                     <Eye className="w-4 h-4 text-gray-500" /> Template Preview
                   </h4>
                   <div className="relative w-full aspect-[1/1.2] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center pointer-events-none">
                      <div className="absolute top-0 left-0 w-[300%] h-[300%] origin-top-left scale-[0.333333] pointer-events-none transition-all duration-300">
                         <div className="p-8 h-full bg-white">
                           <CVRenderer 
                             data={result?.cv || DUMMY_CV} 
                             style={style} 
                             color={colorOption} 
                             layout={layoutOption}
                             matchedKeywords={result?.atsScore?.matchedKeywords}
                           />
                         </div>
                      </div>
                   </div>
                 </div>

                 <div className="space-y-6 mb-10">
                   <div>
                     <h4 className="text-sm font-semibold text-gray-700 mb-3">Base Template Category</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {STYLES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setStyle(s)}
                            className={`flex items-center p-3 border rounded-xl text-sm font-semibold transition-all text-left ${
                              style === s 
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20' 
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                             <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${style === s ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                {style === s && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                             </div>
                             {s}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div>
                     <h4 className="text-sm font-semibold text-gray-700 mb-3">Layout Density Variant</h4>
                     <div className="flex flex-wrap gap-2">
                        {LAYOUTS.map((lay) => (
                          <button
                            key={lay}
                            onClick={() => setLayoutOption(lay)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                               layoutOption === lay
                                 ? 'bg-gray-900 text-white shadow-sm'
                                 : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                             {lay}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div>
                     <h4 className="text-sm font-semibold text-gray-700 mb-3">Accent Color Theme</h4>
                     <div className="flex flex-wrap gap-3">
                        {COLORS.map((col) => {
                          const bgMap: Record<ColorOption, string> = {
                            Indigo: 'bg-indigo-600', Emerald: 'bg-emerald-600', Violet: 'bg-violet-600', Rose: 'bg-rose-600', Slate: 'bg-slate-600'
                          };
                          return (
                            <button
                              key={col}
                              onClick={() => setColorOption(col)}
                              className={`w-8 h-8 rounded-full shadow-sm ring-offset-2 transition-all ${bgMap[col]} ${colorOption === col ? 'ring-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                              title={col}
                            />
                          );
                        })}
                     </div>
                   </div>
                 </div>
                 
                 {error && (
                   <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200/50 flex flex-col gap-1">
                     <span className="font-bold">Generation failed</span>
                     <span className="font-medium text-red-600">{error}</span>
                   </div>
                 )}

                 <button
                    onClick={handleOptimize}
                    disabled={isLoading || !jobDescription || !resume}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-bold py-4 px-6 rounded-2xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing & Tailoring...
                      </>
                    ) : (
                      <>
                        Generate Tailored CV
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400 font-medium mt-5">
                    Utilizes Gemini 3.5 Flash for advanced context extraction and ATS alignment.
                  </p>
               </div>
               
               {history.length > 0 && (
                 <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                      <History className="w-5 h-5 text-indigo-600" />
                      Recent Generates
                    </h3>
                    <div className="space-y-4">
                      {history.map((h, i) => {
                        const prevVersions = history.slice(i + 1).filter(item => item.jobDescription === h.jobDescription);
                        const prevVersion = prevVersions.length > 0 ? prevVersions[0] : null;
                        
                        let trendValue = 0;
                        let isPositive = false;
                        let isNegative = false;
                        
                        if (prevVersion) {
                            const currentScore = h.result.atsScore.score;
                            const prevScore = prevVersion.result.atsScore.score;
                            if (prevScore > 0) {
                              trendValue = ((currentScore - prevScore) / prevScore) * 100;
                              isPositive = trendValue > 0;
                              isNegative = trendValue < 0;
                            }
                        }

                        return (
                        <button
                          key={h.id}
                          onClick={() => {
                            setJobDescription(h.jobDescription);
                            setResume(h.resume);
                            setStyle(h.style);
                            setResult(h.result);
                          }}
                          className="w-full text-left p-5 rounded-2xl border border-gray-200 hover:border-indigo-600 hover:ring-1 hover:ring-indigo-600 hover:bg-indigo-50/30 transition-all group shadow-sm hover:shadow-md"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                               Score: {h.result.atsScore.score}%
                               {prevVersion && (
                                 <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-green-100 text-green-700' : isNegative ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                   {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                   <span>{Math.abs(trendValue).toFixed(1)}%</span>
                                 </span>
                               )}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                               {new Date(h.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mb-3">Style: <span className="font-medium text-gray-700">{h.style}</span></p>
                          <div className="text-sm bg-white border border-gray-100 rounded-lg p-3">
                             <p className="font-semibold text-gray-800 truncate">{h.result.cv.personalInfo.name}</p>
                             <p className="text-xs text-gray-500 truncate mt-0.5">{h.result.cv.personalInfo.title}</p>
                          </div>
                        </button>
                      )})}
                    </div>
                 </div>
               )}
            </div>

          </div>
        ) : (
          <div className="w-full animation-fade-in print:m-0 print:p-0">
             
              {/* Print toolbar */}
             <div className="max-w-4xl mx-auto bg-white border border-gray-200 p-5 rounded-2xl shadow-sm mb-8 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-green-50">
                     <CheckCircle2 className="w-6 h-6 text-green-600" />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 text-lg">Optimization Complete</h3>
                     <p className="text-sm font-medium text-gray-500">Your tailored {style} CV is ready to use.</p>
                   </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleReorderAchievements}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-gray-800 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm"
                    title="Reorder achievements by keyword relevance"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Optimize Order</span>
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm"
                    title="Preview PDF Layout"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview PDF</span>
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm"
                    title="Copy output as plaintext"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy Text</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm"
                    title="Export JSON payload"
                  >
                    <FileJson className="w-4 h-4" />
                    <span className="hidden sm:inline">Export JSON</span>
                  </button>
                  <div className="flex-1 sm:flex-none flex items-center bg-white border border-gray-300 rounded-xl px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <input
                      type="text"
                      placeholder="Company Name (for PDF)"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full sm:w-40 flex-1 outline-none text-sm bg-transparent"
                    />
                  </div>
                  <button
                    onClick={handlePrint}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Save as PDF
                  </button>
                </div>
             </div>

             {/* Output Canvas */}
             <div className="w-full pb-20 print:pb-0">
                {result && (
                  <div className="space-y-8">
                    {/* ATS Score Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print:hidden">
                      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="flex flex-col items-center justify-center min-w-[120px]">
                          <div className="relative flex items-center justify-center w-24 h-24">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                              <circle 
                                cx="48" 
                                cy="48" 
                                r="44" 
                                stroke="currentColor" 
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray={44 * 2 * Math.PI} 
                                strokeDashoffset={(44 * 2 * Math.PI) - ((result.atsScore.score / 100) * (44 * 2 * Math.PI))} 
                                className={`${result.atsScore.score >= 80 ? 'text-green-500' : result.atsScore.score >= 60 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                              />
                            </svg>
                            <div className="absolute flex items-center justify-center text-2xl font-bold text-gray-900">
                              {result.atsScore.score}%
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-600 mt-2">ATS Score</span>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-1">Analysis Feedback</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{result.atsScore.feedback}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                              <h5 className="text-sm font-bold text-green-800 mb-2">Matched Keywords</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {result.atsScore.matchedKeywords.map((kw, i) => (
                                  <span key={i} className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                                    {kw}
                                  </span>
                                ))}
                                {result.atsScore.matchedKeywords.length === 0 && <span className="text-xs text-green-600">None found</span>}
                              </div>
                            </div>
                            
                            <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                              <h5 className="text-sm font-bold text-red-800 mb-2">Suggested Skills to Add <span className="font-normal text-xs text-red-600 ml-1">(Click to insert)</span></h5>
                              <div className="flex flex-wrap gap-1.5">
                                {result.atsScore.missingKeywords.map((kw, i) => (
                                  <button 
                                    key={i} 
                                    onClick={() => setResume(prev => prev + (prev.endsWith('\n') ? '' : '\n') + 'Skill: ' + kw)}
                                    className="bg-red-100/80 hover:bg-red-200 text-red-700 text-xs font-semibold px-2 py-1 rounded-md transition-all flex items-center gap-1 active:scale-95 group shadow-sm"
                                    title="Click to add to your raw resume text"
                                  >
                                    <Plus className="w-3 h-3 text-red-500 group-hover:text-red-700" />
                                    {kw}
                                  </button>
                                ))}
                                {result.atsScore.missingKeywords.length === 0 && <span className="text-xs text-red-600">None missing!</span>}
                              </div>
                            </div>
                          </div>
                          
                          {result.atsScore.tips && result.atsScore.tips.length > 0 && (
                            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mt-4">
                              <h5 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-indigo-600" />
                                Quick Tips
                              </h5>
                              <ul className="space-y-1.5 text-sm text-indigo-800 list-disc list-inside">
                                {result.atsScore.tips.map((tip, i) => (
                                   <li key={i}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {careerGaps.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm print:hidden">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                             <AlertTriangle className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="flex-1 w-full">
                             <h4 className="text-lg font-bold text-amber-900 mb-1">Career Gaps Detected</h4>
                             <p className="text-sm text-amber-800 mb-4">We detected potential gaps in your employment history. Recruiters often look for notes explaining these periods.</p>
                             <ul className="list-disc list-inside text-sm text-amber-900 font-medium mb-5 space-y-1">
                               {careerGaps.map((gap, idx) => (
                                 <li key={idx}>~{gap.durationMonths} months between {gap.olderRole} and {gap.newerRole}</li>
                               ))}
                             </ul>
                             <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                               <label className="block text-sm font-bold text-gray-700 mb-2">Resume Career Note</label>
                               <textarea
                                 className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none"
                                 rows={2}
                                 placeholder="e.g., Took a planned career break for personal development and family obligations."
                                 value={careerNoteInput}
                                 onChange={(e) => handleUpdateCareerNote(e.target.value)}
                               />
                               <p className="text-xs text-gray-500 mt-2 font-medium">This note will appear prominently above your experience section.</p>
                             </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CV Render */}
                    <div id="cv-to-print-main">
                      <CVRenderer data={result.cv} style={style} color={colorOption} layout={layoutOption} onRewrite={handleRewriteAchievement} rewritingIndices={rewritingIndices} matchedKeywords={result.atsScore?.matchedKeywords} />
                    </div>
                  </div>
                )}
             </div>

          </div>
        )}
      </main>

      {/* PDF Preview Modal */}
      {showPreview && result && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-6 print:hidden">
          <div className="bg-zinc-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden ring-1 ring-white/20">
             <div className="bg-zinc-900 px-6 py-4 shrink-0 flex justify-between items-center text-white border-b border-zinc-800">
                <div className="flex items-center gap-3">
                   <Eye className="w-5 h-5 text-indigo-400" />
                   <h3 className="font-bold">PDF Print Preview</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => setShowPreview(false)} className="text-zinc-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
             </div>
             <div className="flex-1 overflow-auto bg-zinc-800/50 p-2 sm:p-10 flex justify-center custom-scrollbar">
                <div className="origin-top-left sm:origin-top scale-[0.4] sm:scale-75 md:scale-90 lg:scale-100 transition-transform">
                  <div id="cv-to-print" className="w-[850px] shadow-2xl bg-white mx-auto sm:mx-0">
                     <CVRenderer data={result.cv} style={style} color={colorOption} layout={layoutOption} matchedKeywords={result.atsScore?.matchedKeywords} />
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}


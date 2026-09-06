import React from 'react';
import { BookOpen, Linkedin, Github, Code2, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#e8e2d8] bg-[#faf8f5] mt-24 py-10 px-4 sm:px-6 lg:px-8 text-stone-600 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
          <div className="flex items-center gap-2 text-stone-900 font-serif text-base font-semibold">
            <div className="w-6 h-6 rounded-lg bg-amber-700/10 text-amber-800 flex items-center justify-center border border-amber-800/15">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span>Personal Gemini Journal</span>
          </div>
          <p className="text-xs text-stone-500 max-w-sm">
            Built for thoughtful reflection, responsible memory, and human-centred AI.
          </p>
          <span className="text-[11px] text-stone-400 pt-1">
            Developed by Sonia Mansha • Google Cloud Gen AI Academy • APAC Cohort 3
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <a
            id="footer-link-linkedin"
            href="https://www.linkedin.com/in/sonia11mansha415/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#0077b5] transition-colors"
          >
            <Linkedin className="w-3.5 h-3.5 shrink-0" />
            <span>LinkedIn</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>

          <a
            id="footer-link-github"
            href="https://github.com/sonia11mansha415"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <Github className="w-3.5 h-3.5 shrink-0" />
            <span>GitHub</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>

          <a
            id="footer-link-source-code"
            href="https://github.com/sonia11mansha415/personal-gemini-journal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-amber-900 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span>Source Code</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
      </div>
    </footer>
  );
};

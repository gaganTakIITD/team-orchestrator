import React, { useState } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Button } from '../../components/ui/components';

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export function ExportReports({ project, vectors }) {
  if (!vectors || vectors.length === 0) return null;

  const [selectedName, setSelectedName] = useState(vectors[0]?.name);
  const selectedV = vectors.find(v => v.name === selectedName) || vectors[0];

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPerson = () => {
    if (!selectedV) return;
    const emailSafe = (selectedV.email || selectedV.name).replace(/[@.]/g, '_');
    downloadJson(selectedV, `${emailSafe}_profile.json`);
  };

  const handleExportTeam = () => {
    if (!project) return;
    downloadJson(vectors, `${project.name.replace(/\s+/g, '_')}_all_vectors.json`);
  };

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <IconDownload />
        Export Reports
      </h3>

      <div className="grid-2col">
        <GlassCard className="export-card">
          <div>
            <div className="export-card-header">
              <div className="export-card-icon accent-bg"><IconUser /></div>
              <h4>Individual Profile</h4>
            </div>
            <p className="export-card-desc">
              Download the complete JSON vector for a specific team member, including scores, breakdown, and coaching summary.
            </p>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="label">Select Member</label>
              <div className="select-wrap">
                <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
                  {vectors.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                </select>
                <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
          <Button onClick={handleExportPerson} className="btn-full">
            <IconDownload /> Download {selectedV?.name}'s Report
          </Button>
        </GlassCard>

        <GlassCard className="export-card">
          <div>
            <div className="export-card-header">
              <div className="export-card-icon info-bg"><IconUsers /></div>
              <h4>Full Team Data</h4>
            </div>
            <p className="export-card-desc">
              Download the aggregated JSON array containing vectors for every team member in {project?.name}.
            </p>
          </div>
          <Button variant="secondary" onClick={handleExportTeam} className="btn-full">
            <IconDownload /> Download All Vectors
          </Button>
        </GlassCard>
      </div>
    </section>
  );
}

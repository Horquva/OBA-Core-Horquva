'use client';

import React from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ValidationRule {
  id: string;
  ruleName: string;
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'VALIDATED' | 'REJECTED' | 'INCONCLUSIVE';
  description: string;
}

const mockRules: ValidationRule[] = [
  {
    id: 'VAL-001',
    ruleName: 'Constitutional Alignment Test',
    category: 'Ethics & Safety',
    severity: 'HIGH',
    status: 'VALIDATED',
    description: 'Verifies model responses against foundational system safety rules.',
  },
  {
    id: 'VAL-002',
    ruleName: 'PII Leakage Prevention',
    category: 'Privacy',
    severity: 'HIGH',
    status: 'VALIDATED',
    description: 'Ensures no personal identifiable information is leaked in outputs.',
  },
  {
    id: 'VAL-003',
    ruleName: 'Hallucination Boundary Scan',
    category: 'Factual Integrity',
    severity: 'MEDIUM',
    status: 'INCONCLUSIVE',
    description: 'Cross-checks model assertions against ground-truth data sources.',
  },
  {
    id: 'VAL-004',
    ruleName: 'Bias & Toxic Language Filter',
    category: 'Content Moderation',
    severity: 'HIGH',
    status: 'REJECTED',
    description: 'Checks for explicit, hate, or biased text generation patterns.',
  },
];

export default function ValidationsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold text-white">Validation Rules</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Active constitutional validation constraints and safety policy gates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockRules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-zinc-500">{rule.id}</span>
                <h3 className="font-semibold text-zinc-100 text-base">{rule.ruleName}</h3>
              </div>
              <Badge status={rule.status} />
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-zinc-400">{rule.description}</p>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                <span className="text-zinc-500">Category: <strong className="text-zinc-300 font-medium">{rule.category}</strong></span>
                <span className={`px-2 py-0.5 rounded font-mono ${
                  rule.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {rule.severity}
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
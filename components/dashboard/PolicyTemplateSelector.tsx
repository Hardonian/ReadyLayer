'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  POLICY_TEMPLATES,
  getTemplatesByCategory,
  type PolicyTemplate,
} from '@/services/policy-engine/templates';
import { Shield, Zap, CheckCircle, Info } from 'lucide-react';

interface PolicyTemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

export function PolicyTemplateSelector({
  onSelect,
}: PolicyTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Templates', icon: CheckCircle },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'compliance', label: 'Compliance', icon: Zap },
    { id: 'code-quality', label: 'Code Quality', icon: Info },
  ];

  const templates =
    selectedCategory === 'all'
      ? POLICY_TEMPLATES
      : getTemplatesByCategory(selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-red-50 border-red-200';
      case 'compliance':
        return 'bg-blue-50 border-blue-200';
      case 'code-quality':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-red-100 text-red-800';
      case 'compliance':
        return 'bg-blue-100 text-blue-800';
      case 'code-quality':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Policy Template</h3>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600">No templates available in this category</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${getCategoryColor(template.category)}`}
            >
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-semibold">{template.name}</h4>
                  <Badge className={getCategoryBadgeColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>
              </div>

              <div className="mb-4 p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-2 font-semibold">
                  Rules: {template.rules.length}
                </p>
                <div className="space-y-1">
                  {template.rules.slice(0, 3).map((rule) => (
                    <p key={rule.id} className="text-xs text-gray-500">
                      • {rule.name}
                    </p>
                  ))}
                  {template.rules.length > 3 && (
                    <p className="text-xs text-gray-500">
                      + {template.rules.length - 3} more rules
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center mb-4">
                <span className="text-xs text-gray-500">
                  v{template.version}
                </span>
              </div>

              <Button
                onClick={() => onSelect(template.id)}
                className="w-full"
              >
                Use This Template
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

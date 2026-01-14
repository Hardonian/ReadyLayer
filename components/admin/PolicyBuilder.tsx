'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, X } from 'lucide-react';

interface PolicyRule {
  id: string;
  pattern: string;
  action: 'block' | 'warn' | 'allow';
  description: string;
  enabled: boolean;
}

interface PolicyBuilderProps {
  initialName?: string;
  initialDescription?: string;
  initialRules?: PolicyRule[];
  onSave?: (policy: any) => void;
  onCancel: () => void;
}

export function PolicyBuilder({
  initialName = '',
  initialDescription = '',
  initialRules = [],
  onSave,
  onCancel,
}: PolicyBuilderProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [rules, setRules] = useState<PolicyRule[]>(
    initialRules.length > 0
      ? initialRules
      : [{ id: '1', pattern: '', action: 'block', description: '', enabled: true }]
  );
  const [saving, setSaving] = useState(false);

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: Date.now().toString(),
        pattern: '',
        action: 'block',
        description: '',
        enabled: true,
      },
    ]);
  };

  const removeRule = (id: string) => {
    if (rules.length > 1) {
      setRules(rules.filter((r) => r.id !== id));
    }
  };

  const updateRule = (id: string, field: string, value: any) => {
    setRules(
      rules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Policy name is required');
      return;
    }

    setSaving(true);
    const validRules = rules.filter((r) => r.pattern.trim());

    if (onSave) {
      onSave({
        name,
        description,
        rules: validRules,
      });
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Create Policy</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Policy Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., OWASP Top 10"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this policy enforces..."
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows={3}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Rules</label>
          <button
            type="button"
            onClick={addRule}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        <div className="space-y-3">
          {rules.map((rule, index) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) =>
                    updateRule(rule.id, 'enabled', e.target.checked)
                  }
                  className="mt-3"
                />

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs text-gray-600">Pattern</label>
                    <Input
                      value={rule.pattern}
                      onChange={(e) =>
                        updateRule(rule.id, 'pattern', e.target.value)
                      }
                      placeholder="e.g., process\\.env\\.API_KEY"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Action</label>
                      <select
                        value={rule.action}
                        onChange={(e) =>
                          updateRule(rule.id, 'action', e.target.value)
                        }
                        className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-md text-xs"
                      >
                        <option value="block">Block</option>
                        <option value="warn">Warn</option>
                        <option value="allow">Allow</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Description</label>
                      <Input
                        value={rule.description}
                        onChange={(e) =>
                          updateRule(rule.id, 'description', e.target.value)
                        }
                        placeholder="Rule description"
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  disabled={rules.length === 1}
                  className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed p-2 mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Policy'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

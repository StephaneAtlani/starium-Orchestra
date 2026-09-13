import { describe, expect, it } from 'vitest';
import {
  isAcceptedProjectDocumentFile,
  projectDocumentTypeLabel,
} from './project-document-accept';

describe('project-document-accept', () => {
  it('accepte PDF par MIME', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(isAcceptedProjectDocumentFile(file)).toBe(true);
  });

  it('refuse exe', () => {
    const file = new File(['x'], 'a.exe', { type: 'application/x-msdownload' });
    expect(isAcceptedProjectDocumentFile(file)).toBe(false);
  });

  it('libellé type depuis extension', () => {
    expect(projectDocumentTypeLabel({ extension: 'pdf', name: 'x' })).toBe('PDF');
  });
});

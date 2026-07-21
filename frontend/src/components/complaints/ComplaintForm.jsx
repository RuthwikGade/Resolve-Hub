import { useState, useRef } from 'react';
import Button from '../ui/Button';
import { COMPLAINT_PRIORITIES, DEFAULT_CATEGORIES } from '../../utils/constants';

export default function ComplaintForm({
  onSubmit,
  loading = false,
  categories = DEFAULT_CATEGORIES,
  initialData = {},
  onSaveDraft,
}) {
  const [form, setForm] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || '',
    priority: initialData.priority || 'medium',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setImages(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.category) errs.category = 'Please select a category';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('category', form.category);
    formData.append('priority', form.priority);
    images.forEach(img => formData.append('attachments', img));

    onSubmit(formData, form);
  };

  const handleDraft = () => {
    if (onSaveDraft) onSaveDraft(form);
  };

  return (
    <form id="complaint-form" onSubmit={handleSubmit}>
      {/* Title */}
      <div className="form-group">
        <label htmlFor="complaint-title" className="form-label">Title</label>
        <input
          id="complaint-title"
          name="title"
          type="text"
          className="form-input"
          placeholder="Brief summary of the issue"
          value={form.title}
          onChange={handleChange}
        />
        {errors.title && <div className="form-error">{errors.title}</div>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="complaint-description" className="form-label">Description</label>
        <textarea
          id="complaint-description"
          name="description"
          className="form-textarea"
          placeholder="Describe the issue in detail…"
          rows={5}
          value={form.description}
          onChange={handleChange}
        />
        {errors.description && <div className="form-error">{errors.description}</div>}
      </div>

      {/* Category */}
      <div className="form-group">
        <label htmlFor="complaint-category" className="form-label">Category</label>
        <select
          id="complaint-category"
          name="category"
          className="form-select"
          value={form.category}
          onChange={handleChange}
        >
          <option value="">Select a category</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {errors.category && <div className="form-error">{errors.category}</div>}
      </div>

      {/* Priority */}
      <div className="form-group">
        <label htmlFor="complaint-priority" className="form-label">Priority</label>
        <select
          id="complaint-priority"
          name="priority"
          className="form-select"
          value={form.priority}
          onChange={handleChange}
        >
          {COMPLAINT_PRIORITIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Image upload */}
      <div className="form-group">
        <label className="form-label">Attachments</label>
        <div
          id="complaint-upload-zone"
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragging');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length) {
              setImages(prev => [...prev, ...files]);
              setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
            }
          }}
        >
          📎 Click or drag images here
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
        </div>
        {previews.length > 0 && (
          <div className="image-preview-grid">
            {previews.map((src, i) => (
              <div key={i} className="image-preview">
                <img src={src} alt={`preview-${i}`} />
                <button
                  type="button"
                  className="image-preview-remove"
                  onClick={() => removeImage(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3" style={{ marginTop: 'var(--space-6)' }}>
        <Button id="complaint-submit" type="submit" loading={loading}>
          Submit Complaint
        </Button>
        {onSaveDraft && (
          <Button id="complaint-save-draft" type="button" variant="secondary" onClick={handleDraft}>
            Save Draft
          </Button>
        )}
      </div>
    </form>
  );
}

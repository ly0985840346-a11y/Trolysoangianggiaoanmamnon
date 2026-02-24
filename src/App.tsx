/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  FileText, 
  Download, 
  History, 
  Trash2, 
  Loader2, 
  Sparkles, 
  ChevronRight,
  Printer,
  BookOpen,
  Users,
  Lightbulb,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateLessonPlan, refineLessonPlan } from './services/geminiService';
import { LessonPlan } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const METHODS = ['STEAM', '5E', 'Montessori', 'EDP (Quy trình thiết kế kỹ thuật)', 'Lấy trẻ làm trung tâm'];
const AGE_GROUPS = ['Nhà trẻ (24-36 tháng)', 'Mẫu giáo bé (3-4 tuổi)', 'Mẫu giáo nhỡ (4-5 tuổi)', 'Mẫu giáo lớn (5-6 tuổi)'];
const DEVELOPMENT_FIELDS = [
  'Lĩnh vực phát triển nhận thức',
  'Lĩnh vực phát triển ngôn ngữ',
  'Lĩnh vực phát triển thể chất',
  'Lĩnh vực phát triển thẩm mỹ',
  'Lĩnh vực phát triển tình cảm kỹ năng xã hội'
];

export default function App() {
  const [topic, setTopic] = useState('');
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[2]);
  const [method, setMethod] = useState(METHODS[0]);
  const [devField, setDevField] = useState(DEVELOPMENT_FIELDS[0]);
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [teachingDate, setTeachingDate] = useState('');
  const [location, setLocation] = useState('');
  const [additional, setAdditional] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<LessonPlan | null>(null);
  const [history, setHistory] = useState<LessonPlan[]>([]);
  const [view, setView] = useState<'editor' | 'history'>('editor');

  useEffect(() => {
    const saved = localStorage.getItem('lesson_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (plan: LessonPlan) => {
    const newHistory = [plan, ...history.filter(h => h.id !== plan.id)].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('lesson_history', JSON.stringify(newHistory));
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const result = await generateLessonPlan({ 
        topic, 
        ageGroup, 
        method, 
        developmentField: devField,
        teacherName,
        className,
        schoolName,
        teachingDate,
        location,
        additionalInfo: additional 
      });
      const newPlan: LessonPlan = {
        ...result,
        id: Date.now().toString(),
        createdAt: Date.now()
      };
      setCurrentPlan(newPlan);
      saveToHistory(newPlan);
    } catch (error) {
      alert('Có lỗi xảy ra khi soạn bài. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!currentPlan || !feedback) return;
    setRefining(true);
    try {
      const result = await refineLessonPlan(currentPlan, feedback);
      const updatedPlan: LessonPlan = {
        ...result,
        id: currentPlan.id, // Keep same ID to update history entry
        createdAt: currentPlan.createdAt
      };
      setCurrentPlan(updatedPlan);
      saveToHistory(updatedPlan);
      setFeedback('');
    } catch (error) {
      alert('Có lỗi xảy ra khi điều chỉnh giáo án. Vui lòng thử lại.');
    } finally {
      setRefining(false);
    }
  };

  const exportPDF = () => {
    if (!currentPlan) return;
    const doc = new jsPDF();
    
    // Add font support for Vietnamese (Standard fonts don't support well, but we'll try basic)
    doc.setFont("helvetica", "bold");
    doc.text(currentPlan.title.toUpperCase(), 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Do tuoi: ${currentPlan.ageGroup}`, 20, 30);
    doc.text(`Phuong phap: ${currentPlan.method}`, 20, 37);
    doc.text(`Linh vuc: ${currentPlan.developmentField}`, 20, 44);
    doc.text(`Giao vien: ${currentPlan.teacherName || ""}`, 120, 30);
    doc.text(`Lop: ${currentPlan.className || ""}`, 120, 37);
    doc.text(`Truong: ${currentPlan.schoolName || ""}`, 120, 44);
    doc.text(`Ngay day: ${currentPlan.teachingDate || ""}`, 20, 51);
    doc.text(`Dia diem: ${currentPlan.location || ""}`, 120, 51);

    doc.setFont("helvetica", "bold");
    doc.text("I. MUC TIEU", 20, 65);
    doc.setFont("helvetica", "normal");
    let y = 72;
    doc.text("- Kien thuc: " + currentPlan.objectives.knowledge.join(", "), 25, y); y += 7;
    doc.text("- Ky nang: " + currentPlan.objectives.skills.join(", "), 25, y); y += 7;
    doc.text("- Thai do: " + currentPlan.objectives.attitude.join(", "), 25, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("II. CHUAN BI", 20, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("- Co: " + currentPlan.preparation.teacher.join(", "), 25, y); y += 7;
    doc.text("- Tre: " + currentPlan.preparation.students.join(", "), 25, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("III. TIEN TRINH HOAT DONG", 20, y); y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Buoc', 'Hoat dong cua Co', 'Hoat dong cua Tre']],
      body: currentPlan.procedure.map(p => [p.step, p.teacherActivity, p.studentActivity]),
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [76, 175, 80] }
    });

    doc.save(`Giao_an_${currentPlan.title.replace(/\s+/g, '_')}.pdf`);
  };

  const exportWord = () => {
    if (!currentPlan) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: currentPlan.title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: `Độ tuổi: ${currentPlan.ageGroup}` }),
          new Paragraph({ text: `Phương pháp: ${currentPlan.method}` }),
          new Paragraph({ text: `Lĩnh vực phát triển: ${currentPlan.developmentField}` }),
          new Paragraph({ text: `Giáo viên: ${currentPlan.teacherName || "................"}` }),
          new Paragraph({ text: `Lớp: ${currentPlan.className || "................"}` }),
          new Paragraph({ text: `Trường: ${currentPlan.schoolName || "................"}` }),
          new Paragraph({ text: `Ngày dạy: ${currentPlan.teachingDate || "................"}` }),
          new Paragraph({ text: `Địa điểm: ${currentPlan.location || "................"}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "I. MỤC TIÊU", heading: HeadingLevel.HEADING_2 }),
          ...currentPlan.objectives.knowledge.map(k => new Paragraph({ text: `• Kiến thức: ${k}`, bullet: { level: 0 } })),
          ...currentPlan.objectives.skills.map(s => new Paragraph({ text: `• Kỹ năng: ${s}`, bullet: { level: 0 } })),
          ...currentPlan.objectives.attitude.map(a => new Paragraph({ text: `• Thái độ: ${a}`, bullet: { level: 0 } })),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "II. CHUẨN BỊ", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `• Cô: ${currentPlan.preparation.teacher.join(", ")}` }),
          new Paragraph({ text: `• Trẻ: ${currentPlan.preparation.students.join(", ")}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "III. TIẾN TRÌNH HOẠT ĐỘNG", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bước", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hoạt động của Cô", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hoạt động của Trẻ", bold: true })] })] }),
                ],
              }),
              ...currentPlan.procedure.map(p => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(p.step)] }),
                  new TableCell({ children: [new Paragraph(p.teacherActivity)] }),
                  new TableCell({ children: [new Paragraph(p.studentActivity)] }),
                ],
              })),
            ],
          }),
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `Giao_an_${currentPlan.title.replace(/\s+/g, '_')}.docx`);
    });
  };

  const deleteHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('lesson_history', JSON.stringify(newHistory));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Trợ lý Giáo án Mầm non AI',
        text: 'Ứng dụng soạn giáo án mầm non thông minh tích hợp STEAM, 5E...',
        url: window.location.href,
      });
    } else {
      alert('Link ứng dụng: ' + window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-[#2D3E50] font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-200">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-blue-900">Trợ lý Giáo án Mầm non</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-1">
              <button 
                onClick={() => setView('editor')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${view === 'editor' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-400 hover:bg-blue-50'}`}
              >
                Soạn bài
              </button>
              <button 
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-400 hover:bg-blue-50'}`}
              >
                Lịch sử
              </button>
            </nav>
            <button 
              onClick={handleShare}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="Chia sẻ ứng dụng"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'editor' ? (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-[400px_1fr] gap-8"
            >
              {/* Sidebar Form */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-blue-100">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-900">
                    <PlusCircle size={18} className="text-blue-600" />
                    Thông tin bài dạy
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Tên bài dạy / Chủ đề</label>
                      <input 
                        type="text" 
                        placeholder="Ví dụ: Làm quen chữ cái A, Ă, Â"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Độ tuổi</label>
                      <select 
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none appearance-none"
                      >
                        {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Lĩnh vực phát triển</label>
                      <select 
                        value={devField}
                        onChange={(e) => setDevField(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none appearance-none"
                      >
                        {DEVELOPMENT_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Phương pháp</label>
                      <select 
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none appearance-none"
                      >
                        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Giáo viên</label>
                        <input 
                          type="text" 
                          placeholder="Tên giáo viên"
                          value={teacherName}
                          onChange={(e) => setTeacherName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Lớp</label>
                        <input 
                          type="text" 
                          placeholder="Tên lớp"
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Trường</label>
                        <input 
                          type="text" 
                          placeholder="Tên trường"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Ngày dạy</label>
                        <input 
                          type="date" 
                          value={teachingDate}
                          onChange={(e) => setTeachingDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Địa điểm (Xã/Thành phố)</label>
                      <input 
                        type="text" 
                        placeholder="Ví dụ: Hà Nội, TP.HCM..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 ml-1">Ghi chú thêm</label>
                      <textarea 
                        rows={2}
                        placeholder="Ví dụ: Sử dụng vật liệu tái chế..."
                        value={additional}
                        onChange={(e) => setAdditional(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-blue-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none resize-none"
                      />
                    </div>

                    <button 
                      onClick={handleGenerate}
                      disabled={loading || !topic}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Sparkles size={20} />
                      )}
                      Soạn giáo án ngay
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-[32px] border border-yellow-100">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-yellow-700">
                    <Lightbulb size={16} className="text-yellow-500" />
                    Mẹo nhỏ cho bạn
                  </h3>
                  <p className="text-sm text-yellow-600 leading-relaxed">
                    Hãy thử yêu cầu các phương pháp như <b>STEAM</b> để AI gợi ý những hoạt động thí nghiệm thú vị cho trẻ nhé!
                  </p>
                </div>
              </div>

              {/* Preview Area */}
              <div className="min-h-[600px]">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center text-blue-400 space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <p className="font-bold animate-pulse">AI đang nghiên cứu và soạn bài cho bạn...</p>
                  </div>
                ) : currentPlan ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-[32px] shadow-sm border border-blue-100 overflow-hidden"
                  >
                    {/* Toolbar */}
                    <div className="bg-blue-50/50 px-8 py-4 flex items-center justify-between border-b border-blue-100">
                      <span className="text-sm font-bold text-blue-400">Bản xem trước giáo án</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={exportPDF}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600" 
                          title="Tải PDF"
                        >
                          <Printer size={20} />
                        </button>
                        <button 
                          onClick={exportWord}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600" 
                          title="Tải Word"
                        >
                          <FileText size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12 space-y-10 max-h-[800px] overflow-y-auto custom-scrollbar">
                      {/* Top Metadata */}
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-blue-800 border-b border-blue-50 pb-6">
                        <div className="space-y-1">
                          <p><span className="text-blue-400">Trường:</span> {currentPlan.schoolName || "................"}</p>
                          <p><span className="text-blue-400">Lớp:</span> {currentPlan.className || "................"}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p><span className="text-blue-400">Giáo viên:</span> {currentPlan.teacherName || "................"}</p>
                          <p><span className="text-blue-400">Ngày dạy:</span> {currentPlan.teachingDate || "................"}</p>
                        </div>
                      </div>

                      <div className="text-center space-y-3">
                        <h2 className="text-3xl font-serif font-bold text-blue-900 leading-tight">{currentPlan.title}</h2>
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full flex items-center gap-1.5"><Users size={14} /> {currentPlan.ageGroup}</span>
                          <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full flex items-center gap-1.5"><Sparkles size={14} /> {currentPlan.method}</span>
                        </div>
                        <p className="text-sm font-bold text-blue-500 italic">{currentPlan.developmentField}</p>
                      </div>

                      <section className="space-y-4">
                        <h3 className="text-lg font-bold border-l-4 border-blue-600 pl-3 text-blue-900">I. MỤC TIÊU</h3>
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Kiến thức</h4>
                            <ul className="text-sm space-y-2 text-blue-800">
                              {currentPlan.objectives.knowledge.map((k, i) => <li key={i} className="flex gap-2">• <span>{k}</span></li>)}
                            </ul>
                          </div>
                          <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Kỹ năng</h4>
                            <ul className="text-sm space-y-2 text-blue-800">
                              {currentPlan.objectives.skills.map((s, i) => <li key={i} className="flex gap-2">• <span>{s}</span></li>)}
                            </ul>
                          </div>
                          <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Thái độ</h4>
                            <ul className="text-sm space-y-2 text-blue-800">
                              {currentPlan.objectives.attitude.map((a, i) => <li key={i} className="flex gap-2">• <span>{a}</span></li>)}
                            </ul>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-bold border-l-4 border-blue-600 pl-3 text-blue-900">II. CHUẨN BỊ</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-blue-700">Đồ dùng của Cô</h4>
                            <p className="text-sm text-blue-800 leading-relaxed">{currentPlan.preparation.teacher.join(", ")}</p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-blue-700">Đồ dùng của Trẻ</h4>
                            <p className="text-sm text-blue-800 leading-relaxed">{currentPlan.preparation.students.join(", ")}</p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-lg font-bold border-l-4 border-blue-600 pl-3 text-blue-900">III. TIẾN TRÌNH HOẠT ĐỘNG</h3>
                        <div className="border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-blue-50 text-blue-700 font-bold">
                                <th className="px-4 py-3 text-left w-32 border-r border-blue-100">Bước</th>
                                <th className="px-4 py-3 text-left border-r border-blue-100">Hoạt động của Cô</th>
                                <th className="px-4 py-3 text-left">Hoạt động của Trẻ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50 text-blue-900">
                              {currentPlan.procedure.map((p, i) => (
                                <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                                  <td className="px-4 py-4 font-bold text-blue-700 border-r border-blue-100">{p.step}</td>
                                  <td className="px-4 py-4 leading-relaxed border-r border-blue-100">{p.teacherActivity}</td>
                                  <td className="px-4 py-4 leading-relaxed">{p.studentActivity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      {/* Signature Footer */}
                      <div className="pt-12 grid grid-cols-2 gap-8 text-sm font-bold text-blue-800">
                        <div className="text-center space-y-16">
                          <p className="uppercase">Ban giám hiệu</p>
                          <p className="italic text-blue-300 font-normal">(Ký và ghi rõ họ tên)</p>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="italic font-normal">{currentPlan.location || "................"}, Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                          <p className="uppercase pt-1">Giáo viên thực hiện</p>
                          <div className="h-16"></div>
                          <p>{currentPlan.teacherName || "................................"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Refinement Area */}
                    <div className="bg-yellow-50/50 p-6 border-t border-blue-100">
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          placeholder="Chưa đúng ý? Hãy nhập yêu cầu điều chỉnh tại đây..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-2xl bg-white border border-blue-100 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                        />
                        <button 
                          onClick={handleRefine}
                          disabled={refining || !feedback}
                          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-100"
                        >
                          {refining ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                          Điều chỉnh
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#8A8A80] bg-white rounded-[32px] border border-dashed border-[#D1D1CB] p-12 text-center">
                    <div className="w-20 h-20 bg-[#F5F5F0] rounded-full flex items-center justify-center mb-6">
                      <FileText size={32} className="text-[#D1D1CB]" />
                    </div>
                    <h3 className="text-xl font-medium text-[#4A4A40] mb-2">Chưa có nội dung soạn thảo</h3>
                    <p className="max-w-xs">Hãy điền thông tin bên trái và nhấn nút "Soạn giáo án" để bắt đầu.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif font-bold text-blue-900">Lịch sử soạn bài</h2>
                <span className="text-sm text-blue-400 font-bold">{history.length} bản ghi</span>
              </div>

              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((h) => (
                    <div 
                      key={h.id}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-blue-900">{h.title}</h3>
                          <p className="text-sm text-blue-400 flex items-center gap-2 font-medium">
                            {h.ageGroup} • {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setCurrentPlan(h); setView('editor'); }}
                          className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          Xem lại
                        </button>
                        <button 
                          onClick={() => deleteHistory(h.id)}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-blue-200">
                  <History size={48} className="mx-auto text-blue-100 mb-4" />
                  <p className="text-blue-400 font-medium">Bạn chưa soạn bài nào. Hãy bắt đầu soạn bài đầu tiên!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-blue-100 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-blue-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">AI</div>
            <span className="font-medium">Trợ lý Giáo án Mầm non • Phát triển bởi Chuyên gia AI Studio</span>
          </div>
          <div className="flex gap-8 font-bold">
            <a href="#" className="hover:text-blue-600 transition-colors">Hướng dẫn</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Chính sách</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Phản hồi</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #DBEAFE;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #BFDBFE;
        }
      `}</style>
    </div>
  );
}

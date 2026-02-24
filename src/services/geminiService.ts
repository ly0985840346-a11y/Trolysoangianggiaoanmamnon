import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan } from "../types";

const SYSTEM_INSTRUCTION = `
Bạn là một Chuyên gia Tư vấn Giáo dục Mầm non cao cấp tại Việt Nam. 
Nhiệm vụ của bạn là soạn thảo giáo án chi tiết cho giáo viên mầm non.

YÊU CẦU ĐỊNH DẠNG OUTPUT (JSON):
{
  "title": "Tên bài dạy",
  "ageGroup": "Độ tuổi",
  "method": "Phương pháp sử dụng",
  "developmentField": "Lĩnh vực phát triển",
  "objectives": {
    "knowledge": ["Ý 1", "Ý 2"],
    "skills": ["Ý 1", "Ý 2"],
    "attitude": ["Ý 1", "Ý 2"]
  },
  "preparation": {
    "teacher": ["Đồ dùng của cô"],
    "students": ["Đồ dùng của trẻ"]
  },
  "procedure": [
    {
      "step": "Tên bước (ví dụ: Ổn định tổ chức)",
      "teacherActivity": "Nội dung chi tiết hoạt động của cô",
      "studentActivity": "Nội dung chi tiết hoạt động của trẻ"
    }
  ]
}

QUY TẮC NỘI DUNG:
1. Ngôn ngữ tiếng Việt chuẩn sư phạm mầm non.
2. Mục tiêu phải đo lường được.
3. Tiến trình phải chi tiết, sáng tạo, lấy trẻ làm trung tâm.
4. Tích hợp đúng phương pháp người dùng yêu cầu (STEAM, 5E, Montessori, v.v.).
`;

export async function generateLessonPlan(params: {
  topic: string;
  ageGroup: string;
  method: string;
  developmentField: string;
  teacherName?: string;
  className?: string;
  schoolName?: string;
  teachingDate?: string;
  location?: string;
  additionalInfo?: string;
}) {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const model = "gemini-3.1-pro-preview";

  const prompt = `Hãy soạn giáo án mầm non với thông tin sau:
  - Chủ đề/Tên bài: ${params.topic}
  - Độ tuổi: ${params.ageGroup}
  - Phương pháp: ${params.method}
  - Lĩnh vực phát triển: ${params.developmentField}
  - Giáo viên: ${params.teacherName || "Chưa cập nhật"}
  - Lớp: ${params.className || "Chưa cập nhật"}
  - Trường: ${params.schoolName || "Chưa cập nhật"}
  - Ngày dạy: ${params.teachingDate || "Chưa cập nhật"}
  - Địa điểm (Xã/Thành phố): ${params.location || "Chưa cập nhật"}
  - Ghi chú thêm: ${params.additionalInfo || "Không có"}
  
  Hãy trả về định dạng JSON như đã hướng dẫn trong System Instruction.`;

  return callGemini(genAI, model, prompt);
}

export async function refineLessonPlan(currentPlan: LessonPlan, feedback: string) {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const model = "gemini-3.1-pro-preview";

  const prompt = `Dưới đây là giáo án hiện tại:
  ${JSON.stringify(currentPlan, null, 2)}
  
  Người dùng muốn điều chỉnh như sau: "${feedback}"
  
  Hãy cập nhật giáo án dựa trên yêu cầu trên và trả về định dạng JSON đầy đủ.`;

  return callGemini(genAI, model, prompt);
}

async function callGemini(genAI: any, model: string, prompt: string) {
  try {
    const response = await genAI.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ageGroup: { type: Type.STRING },
            method: { type: Type.STRING },
            developmentField: { type: Type.STRING },
            teacherName: { type: Type.STRING },
            className: { type: Type.STRING },
            schoolName: { type: Type.STRING },
            teachingDate: { type: Type.STRING },
            location: { type: Type.STRING },
            objectives: {
              type: Type.OBJECT,
              properties: {
                knowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                attitude: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            preparation: {
              type: Type.OBJECT,
              properties: {
                teacher: { type: Type.ARRAY, items: { type: Type.STRING } },
                students: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            procedure: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  teacherActivity: { type: Type.STRING },
                  studentActivity: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw error;
  }
}

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { query } from '../database/connection';

interface ContractData {
  projectId: number;
  projectTitle: string;
  projectDescription: string;
  budget: number;
  deadline: string;
  employerName: string;
  employerEmail: string;
  employerPhone: string;
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  milestones: Array<{
    title: string;
    description: string;
    amount: number;
    deadline: string;
  }>;
  createdAt: Date;
}

class ContractService {
  
  // Generate contract number
  private generateContractNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-6);
    
    return `ZMN-${year}${month}${day}-${time}`;
  }

  // Format currency
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
  }

  // Format date
  private formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Generate PDF contract
  async generateContract(contractData: ContractData): Promise<{ contractNumber: string; pdfPath: string }> {
    try {
      const contractNumber = this.generateContractNumber();
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      
      // Add fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const { width, height } = page.getSize();
      let yPosition = height - 50;
      
      // Helper function to add text
      const addText = (text: string, x: number, y: number, options: any = {}) => {
        page.drawText(text, {
          x,
          y,
          size: options.size || 12,
          font: options.bold ? boldFont : font,
          color: options.color || rgb(0, 0, 0),
          ...options
        });
      };

      // Header
      addText('قرارداد خدمات امانی پلتفرم ضمانو', width / 2 - 150, yPosition, { 
        size: 18, 
        bold: true,
        color: rgb(0.2, 0.4, 0.8)
      });
      yPosition -= 30;

      addText(`شماره قرارداد: ${contractNumber}`, width - 200, yPosition, { bold: true });
      yPosition -= 20;

      addText(`تاریخ تنظیم: ${this.formatDate(contractData.createdAt)}`, width - 200, yPosition);
      yPosition -= 40;

      // Contract introduction
      const introText = [
        'این قرارداد بین طرفین ذیل به منظور انجام خدمات تخصصی از طریق پلتفرم ضمانو منعقد می‌گردد:',
        ''
      ];

      introText.forEach(line => {
        addText(line, 50, yPosition, { size: 11 });
        yPosition -= 20;
      });

      // Employer section
      addText('طرف اول (کارفرما):', 50, yPosition, { bold: true, size: 14 });
      yPosition -= 25;

      const employerInfo = [
        `نام و نام خانوادگی: ${contractData.employerName}`,
        `ایمیل: ${contractData.employerEmail}`,
        `شماره تماس: ${contractData.employerPhone}`,
        ''
      ];

      employerInfo.forEach(line => {
        addText(line, 70, yPosition);
        yPosition -= 18;
      });

      // Contractor section
      addText('طرف دوم (مجری):', 50, yPosition, { bold: true, size: 14 });
      yPosition -= 25;

      const contractorInfo = [
        `نام و نام خانوادگی: ${contractData.contractorName}`,
        `ایمیل: ${contractData.contractorEmail}`,
        `شماره تماس: ${contractData.contractorPhone}`,
        ''
      ];

      contractorInfo.forEach(line => {
        addText(line, 70, yPosition);
        yPosition -= 18;
      });

      // Project details
      addText('مشخصات پروژه:', 50, yPosition, { bold: true, size: 14 });
      yPosition -= 25;

      const projectInfo = [
        `عنوان پروژه: ${contractData.projectTitle}`,
        `توضیحات: ${contractData.projectDescription.substring(0, 200)}${contractData.projectDescription.length > 200 ? '...' : ''}`,
        `مبلغ کل: ${this.formatCurrency(contractData.budget)}`,
        `مهلت تحویل: ${this.formatDate(contractData.deadline)}`,
        ''
      ];

      projectInfo.forEach(line => {
        if (line.length > 70) {
          // Split long lines
          const words = line.split(' ');
          let currentLine = '';
          words.forEach(word => {
            if ((currentLine + word).length > 70) {
              addText(currentLine, 70, yPosition);
              yPosition -= 18;
              currentLine = word + ' ';
            } else {
              currentLine += word + ' ';
            }
          });
          if (currentLine.trim()) {
            addText(currentLine.trim(), 70, yPosition);
            yPosition -= 18;
          }
        } else {
          addText(line, 70, yPosition);
          yPosition -= 18;
        }
      });

      // Milestones section
      if (contractData.milestones.length > 0) {
        addText('مراحل انجام کار:', 50, yPosition, { bold: true, size: 14 });
        yPosition -= 25;

        contractData.milestones.forEach((milestone, index) => {
          addText(`مرحله ${index + 1}: ${milestone.title}`, 70, yPosition, { bold: true });
          yPosition -= 18;
          addText(`مبلغ: ${this.formatCurrency(milestone.amount)}`, 90, yPosition);
          yPosition -= 18;
          if (milestone.deadline) {
            addText(`مهلت: ${this.formatDate(milestone.deadline)}`, 90, yPosition);
            yPosition -= 18;
          }
          if (milestone.description) {
            addText(`توضیحات: ${milestone.description}`, 90, yPosition);
            yPosition -= 18;
          }
          yPosition -= 10;
        });
      }

      // Terms and conditions
      if (yPosition < 200) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595, 842]);
        page.drawText = newPage.drawText.bind(newPage);
        yPosition = height - 50;
      }

      addText('شرایط و مقررات:', 50, yPosition, { bold: true, size: 14 });
      yPosition -= 25;

      const terms = [
        '1. پرداخت مبلغ قرارداد به صورت امانی در پلتفرم ضمانو نگهداری می‌شود.',
        '2. آزادسازی وجه پس از تایید کارفرما یا رأی داور انجام خواهد شد.',
        '3. در صورت بروز اختلاف، موضوع به داوری ارجاع خواهد شد.',
        '4. مجری متعهد به تحویل کار در مهلت مقرر می‌باشد.',
        '5. کارفرما متعهد به همکاری لازم برای انجام پروژه می‌باشد.',
        '6. تمامی مکاتبات از طریق پلتفرم ضمانو انجام می‌شود.',
        '7. این قرارداد تابع قوانین جمهوری اسلامی ایران است.',
        ''
      ];

      terms.forEach(term => {
        if (term.length > 70) {
          const words = term.split(' ');
          let currentLine = '';
          words.forEach(word => {
            if ((currentLine + word).length > 70) {
              addText(currentLine, 70, yPosition);
              yPosition -= 18;
              currentLine = '  ' + word + ' ';
            } else {
              currentLine += word + ' ';
            }
          });
          if (currentLine.trim()) {
            addText(currentLine.trim(), 70, yPosition);
            yPosition -= 18;
          }
        } else {
          addText(term, 70, yPosition);
          yPosition -= 18;
        }
      });

      // Signatures section
      yPosition -= 30;
      addText('امضاء طرفین:', 50, yPosition, { bold: true, size: 14 });
      yPosition -= 40;

      // Employer signature
      addText('طرف اول (کارفرما):', 80, yPosition, { bold: true });
      addText('طرف دوم (مجری):', 350, yPosition, { bold: true });
      yPosition -= 30;

      addText('نام:', 80, yPosition);
      addText('نام:', 350, yPosition);
      yPosition -= 30;

      addText('امضا:', 80, yPosition);
      addText('امضا:', 350, yPosition);
      yPosition -= 30;

      addText('تاریخ:', 80, yPosition);
      addText('تاریخ:', 350, yPosition);

      // Footer
      addText('این قرارداد توسط پلتفرم ضمانو تولید شده است - zemano.ir', 
              width / 2 - 150, 30, { size: 10, color: rgb(0.5, 0.5, 0.5) });

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      
      // Ensure contracts directory exists
      const contractsDir = path.join(process.cwd(), 'uploads', 'contracts');
      if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
      }

      const pdfPath = path.join(contractsDir, `contract-${contractNumber}.pdf`);
      fs.writeFileSync(pdfPath, pdfBytes);

      return {
        contractNumber,
        pdfPath
      };

    } catch (error) {
      console.error('Generate contract error:', error);
      throw new Error('خطا در تولید قرارداد');
    }
  }

  // Create contract for project
  async createProjectContract(projectId: number): Promise<{ success: boolean; contractNumber?: string; message: string }> {
    try {
      // Check if contract already exists
      const existingContract = await query(
        'SELECT id FROM contracts WHERE project_id = $1',
        [projectId]
      );

      if (existingContract.rows.length > 0) {
        return {
          success: false,
          message: 'قرارداد برای این پروژه قبلاً تولید شده است'
        };
      }

      // Get project details
      const projectResult = await query(`
        SELECT 
          p.*,
          e.first_name as employer_first_name,
          e.last_name as employer_last_name,
          e.email as employer_email,
          e.phone_number as employer_phone,
          c.first_name as contractor_first_name,
          c.last_name as contractor_last_name,
          c.email as contractor_email,
          c.phone_number as contractor_phone
        FROM projects p
        JOIN users e ON p.employer_id = e.id
        LEFT JOIN users c ON p.contractor_id = c.id
        WHERE p.id = $1
      `, [projectId]);

      if (projectResult.rows.length === 0) {
        return {
          success: false,
          message: 'پروژه یافت نشد'
        };
      }

      const project = projectResult.rows[0];

      if (!project.contractor_id) {
        return {
          success: false,
          message: 'مجری برای این پروژه انتخاب نشده است'
        };
      }

      // Get milestones
      const milestonesResult = await query(
        'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_index',
        [projectId]
      );

      const contractData: ContractData = {
        projectId,
        projectTitle: project.title,
        projectDescription: project.description,
        budget: parseFloat(project.budget),
        deadline: project.deadline,
        employerName: `${project.employer_first_name} ${project.employer_last_name}`,
        employerEmail: project.employer_email,
        employerPhone: project.employer_phone,
        contractorName: `${project.contractor_first_name} ${project.contractor_last_name}`,
        contractorEmail: project.contractor_email,
        contractorPhone: project.contractor_phone,
        milestones: milestonesResult.rows.map(m => ({
          title: m.title,
          description: m.description || '',
          amount: parseFloat(m.amount),
          deadline: m.deadline
        })),
        createdAt: new Date()
      };

      // Generate PDF contract
      const { contractNumber, pdfPath } = await this.generateContract(contractData);

      // Save contract info to database
      await query(`
        INSERT INTO contracts (
          project_id, contract_number, content, pdf_path, 
          employer_signed, contractor_signed, created_at
        ) VALUES ($1, $2, $3, $4, false, false, NOW())
      `, [
        projectId,
        contractNumber,
        JSON.stringify(contractData),
        pdfPath
      ]);

      return {
        success: true,
        contractNumber,
        message: 'قرارداد با موفقیت تولید شد'
      };

    } catch (error) {
      console.error('Create project contract error:', error);
      return {
        success: false,
        message: 'خطا در تولید قرارداد پروژه'
      };
    }
  }

  // Sign contract
  async signContract(contractId: number, userId: number, role: 'employer' | 'contractor'): Promise<{ success: boolean; message: string }> {
    try {
      // Get contract with project info
      const contractResult = await query(`
        SELECT c.*, p.employer_id, p.contractor_id
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        WHERE c.id = $1
      `, [contractId]);

      if (contractResult.rows.length === 0) {
        return {
          success: false,
          message: 'قرارداد یافت نشد'
        };
      }

      const contract = contractResult.rows[0];

      // Verify user permission
      if (role === 'employer' && contract.employer_id !== userId) {
        return {
          success: false,
          message: 'شما مجاز به امضای این قرارداد نیستید'
        };
      }

      if (role === 'contractor' && contract.contractor_id !== userId) {
        return {
          success: false,
          message: 'شما مجاز به امضای این قرارداد نیستید'
        };
      }

      // Check if already signed
      if (role === 'employer' && contract.employer_signed) {
        return {
          success: false,
          message: 'شما قبلاً این قرارداد را امضا کرده‌اید'
        };
      }

      if (role === 'contractor' && contract.contractor_signed) {
        return {
          success: false,
          message: 'شما قبلاً این قرارداد را امضا کرده‌اید'
        };
      }

      // Update signature
      if (role === 'employer') {
        await query(
          'UPDATE contracts SET employer_signed = true, employer_signature_date = NOW() WHERE id = $1',
          [contractId]
        );
      } else {
        await query(
          'UPDATE contracts SET contractor_signed = true, contractor_signature_date = NOW() WHERE id = $1',
          [contractId]
        );
      }

      return {
        success: true,
        message: 'قرارد��د با موفقیت امضا شد'
      };

    } catch (error) {
      console.error('Sign contract error:', error);
      return {
        success: false,
        message: 'خطا در امضای ��رارداد'
      };
    }
  }

  // Get contract PDF
  async getContractPdf(contractId: number, userId: number): Promise<{ success: boolean; pdfPath?: string; message: string }> {
    try {
      // Get contract with project info
      const contractResult = await query(`
        SELECT c.*, p.employer_id, p.contractor_id
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        WHERE c.id = $1
      `, [contractId]);

      if (contractResult.rows.length === 0) {
        return {
          success: false,
          message: 'قرارداد یافت نشد'
        };
      }

      const contract = contractResult.rows[0];

      // Check access permission
      const hasAccess = contract.employer_id === userId || 
                       contract.contractor_id === userId ||
                       // Admin check would go here
                       false;

      if (!hasAccess) {
        return {
          success: false,
          message: 'دسترسی به این قرارداد ندارید'
        };
      }

      // Check if PDF file exists
      if (!fs.existsSync(contract.pdf_path)) {
        return {
          success: false,
          message: 'فایل PDF قرارداد یافت نشد'
        };
      }

      return {
        success: true,
        pdfPath: contract.pdf_path,
        message: 'قرارداد دریافت شد'
      };

    } catch (error) {
      console.error('Get contract PDF error:', error);
      return {
        success: false,
        message: 'خطا در دریافت قرارداد'
      };
    }
  }
}

export const contractService = new ContractService();

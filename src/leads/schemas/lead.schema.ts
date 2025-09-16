import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeadDocument = Lead & Document;

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  COLD_CALL = 'cold_call',
  EMAIL_CAMPAIGN = 'email_campaign',
  OTHER = 'other',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  company?: string;

  @Prop()
  jobTitle?: string;

  @Prop({ type: String, enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Prop({ type: String, enum: LeadSource, required: true })
  source: LeadSource;

  @Prop({ type: String, enum: LeadPriority, default: LeadPriority.MEDIUM })
  priority: LeadPriority;

  @Prop()
  notes?: string;

  @Prop({ type: Object })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  @Prop({ type: Object })
  customFields?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop()
  lastContactDate?: Date;

  @Prop()
  nextFollowUpDate?: Date;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  tags?: string[];

  @Prop()
  estimatedValue?: number;

  @Prop()
  actualValue?: number;

  @Prop()
  conversionDate?: Date;

  @Prop()
  lostReason?: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

// Indexes for better query performance
LeadSchema.index({ email: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ createdBy: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ lastContactDate: -1 });

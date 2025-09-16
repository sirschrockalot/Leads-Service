import { Document, Types } from 'mongoose';
export type LeadDocument = Lead & Document;
export declare enum LeadStatus {
    NEW = "new",
    CONTACTED = "contacted",
    QUALIFIED = "qualified",
    CONVERTED = "converted",
    LOST = "lost"
}
export declare enum LeadSource {
    WEBSITE = "website",
    REFERRAL = "referral",
    SOCIAL_MEDIA = "social_media",
    ADVERTISING = "advertising",
    COLD_CALL = "cold_call",
    EMAIL_CAMPAIGN = "email_campaign",
    OTHER = "other"
}
export declare enum LeadPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare class Lead {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company?: string;
    jobTitle?: string;
    status: LeadStatus;
    source: LeadSource;
    priority: LeadPriority;
    notes?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    customFields?: Record<string, any>;
    assignedTo?: Types.ObjectId;
    createdBy: Types.ObjectId;
    lastContactDate?: Date;
    nextFollowUpDate?: Date;
    score: number;
    isActive: boolean;
    tags?: string[];
    estimatedValue?: number;
    actualValue?: number;
    conversionDate?: Date;
    lostReason?: string;
}
export declare const LeadSchema: import("mongoose").Schema<Lead, import("mongoose").Model<Lead, any, any, any, Document<unknown, any, Lead> & Lead & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Lead, Document<unknown, {}, import("mongoose").FlatRecord<Lead>> & import("mongoose").FlatRecord<Lead> & {
    _id: Types.ObjectId;
}>;

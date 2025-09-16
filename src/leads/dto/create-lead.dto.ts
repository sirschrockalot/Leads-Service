import { IsEmail, IsString, IsOptional, IsEnum, IsNumber, IsObject, IsArray, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus, LeadSource, LeadPriority } from '../schemas/lead.schema';

export class CreateLeadDto {
  @ApiProperty({ description: 'First name of the lead' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the lead' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address of the lead' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number of the lead' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ 
    description: 'Lead status',
    enum: LeadStatus,
    default: LeadStatus.NEW
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiProperty({ 
    description: 'Lead source',
    enum: LeadSource
  })
  @IsEnum(LeadSource)
  source: LeadSource;

  @ApiPropertyOptional({ 
    description: 'Lead priority',
    enum: LeadPriority,
    default: LeadPriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @ApiPropertyOptional({ description: 'Notes about the lead' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Address information' })
  @IsOptional()
  @IsObject()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'ID of user assigned to this lead' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Last contact date' })
  @IsOptional()
  @IsDateString()
  lastContactDate?: string;

  @ApiPropertyOptional({ description: 'Next follow-up date' })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional({ description: 'Lead score (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ description: 'Tags for the lead' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Estimated value of the lead' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedValue?: number;
}

import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LeadStatus, LeadSource, LeadPriority } from '../schemas/lead.schema';

export class LeadQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by lead status',
    enum: LeadStatus
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by lead source',
    enum: LeadSource
  })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ 
    description: 'Filter by lead priority',
    enum: LeadPriority
  })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Filter by created by user ID' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum score' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum score' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum estimated value' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minEstimatedValue?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum estimated value' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxEstimatedValue?: number;

  @ApiPropertyOptional({ description: 'Filter by date range - start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by date range - end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by last contact date - start' })
  @IsOptional()
  @IsDateString()
  lastContactStartDate?: string;

  @ApiPropertyOptional({ description: 'Filter by last contact date - end' })
  @IsOptional()
  @IsDateString()
  lastContactEndDate?: string;

  @ApiPropertyOptional({ description: 'Filter by next follow-up date - start' })
  @IsOptional()
  @IsDateString()
  nextFollowUpStartDate?: string;

  @ApiPropertyOptional({ description: 'Filter by next follow-up date - end' })
  @IsOptional()
  @IsDateString()
  nextFollowUpEndDate?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

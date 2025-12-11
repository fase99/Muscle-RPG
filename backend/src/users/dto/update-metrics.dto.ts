import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MetricDto {
    @IsString()
    icon: string;

    @IsString()
    label: string;

    @IsString()
    subLabel: string;

    @IsString()
    value: string;

    @IsString()
    unit: string;

    @IsString()
    trend: string;
}

export class UpdateMetricsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MetricDto)
    metricas: MetricDto[];
}

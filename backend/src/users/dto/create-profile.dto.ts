import { IsNumber, IsEnum, IsBoolean, IsOptional } from 'class-validator';


export enum Genero {
    Male = 1,
    Female= 0
}


export enum NivelActividad {
    SEDENTARY = 'sedentary',
    ACTIVE = 'active',
    SPORT = 'sport',
}

export class CreateProfileDto{
    @IsNumber()
    age: number;

    @IsEnum(Genero)
    gender: Genero;

    @IsNumber()
    experienceMonths: number;

    @IsNumber()
    weight: number; //kg

    @IsNumber()
    height: number //estatura

    @IsEnum(NivelActividad)
    nivelactividad: NivelActividad;

    @IsBoolean()
    condicionmedica: boolean;


    @IsOptional()
    @IsNumber()
    knownBodyFat?: number; //para metodo de 7 pliegues
}
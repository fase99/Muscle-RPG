import { Injectable } from '@nestjs/common';
import { CreateProfileDto, Genero, NivelActividad } from './dto/create-profile.dto';


@Injectable()
export class profilingService{


    calcularNivelUsuario(data: CreateProfileDto){
        //para factor de seguridad

        const deltaSalud = data.condicionmedica ? 0 : 1;

        let pExp = 0;  //puntaje de experiencia de la tabla 2 jeje

        if (data.experienceMonths < 3){
            pExp = 5;
        }

        else if(data.experienceMonths < 6){
            pExp = 15;
        }
        else if(data.experienceMonths < 12){
            pExp = 30;
        }

        else if(data.experienceMonths < 24){
            pExp = 45;
        }
        else{
            pExp = 60;
        }

        let pAct = 0;
        switch (data.nivelactividad) {
          case NivelActividad.SEDENTARY: pAct = 0; break;
          case NivelActividad.ACTIVE: pAct = 10; break;
          case NivelActividad.SPORT: pAct = 20; break;
        }

        //para la composicion corporal:
        let pgc = data.knownBodyFat;


        if (!pgc){
            const imc = data.weight / (data.height * data.height);
            pgc = (1.20 *imc) + (0.23 * data.age) - (10.8 * data.gender) - 5.4;
        }

        const muComp = this.getCompositionMultiplier(pgc, data.gender, data.weight, data.height);

        const sRpg = (pExp + pAct) * muComp * deltaSalud;


        let level = 'Básico';
        if (sRpg > 65) level = 'Avanzado';
        else if (sRpg >= 36) level = 'Intermedio';

        return {
          sRpg,
          level,
          estimatedBodyFat: pgc,
          compositionMultiplier: muComp
        };
    }

    private getCompositionMultiplier(pgc: number, gender: Genero, weight: number, height: number): number {
    const imc = weight / (height * height);

    // Caso Especial: Bajo Peso (Penalización)
    if (imc < 18.5) return 0.90;

    if (gender === Genero.Male) {
      if (pgc < 13) return 1.20;       // Muy Definido
      if (pgc <= 17) return 1.10;      // Atlético
      if (pgc <= 24) return 1.00;      // Saludable
      if (pgc <= 29) return 0.90;      // Sobrepeso
      return 0.80;                     // Obesidad (>30%)
    } else {
      // Rangos Mujeres
      if (pgc < 20) return 1.20;
      if (pgc <= 24) return 1.10;
      if (pgc <= 31) return 1.00;
      if (pgc <= 37) return 0.90;
      return 0.80;                     // Obesidad (>38%)
    }
  }
}
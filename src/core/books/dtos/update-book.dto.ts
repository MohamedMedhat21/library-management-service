import {
  IsISBN,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author?: string;

  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableQuantity?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shelfLocation?: string;
}

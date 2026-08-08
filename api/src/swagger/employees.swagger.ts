import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CreateEmployeeDto } from '../modules/employees/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../modules/employees/dto/update-employee.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

export function ApiEmployeesDocs() {
  return applyDecorators(ApiTags('Employees'), ApiBearerAuth('bearer-auth'));
}

export function ApiCreateEmployeeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create Employee',
      description: 'Creates a new employee record (Admin only).',
    }),
    ApiBody({ type: CreateEmployeeDto }),
    ApiResponse({ status: 201, description: 'Employee created successfully.' }),
    ApiResponse({ status: 400, description: 'Validation error or duplicate email' }),
    ApiResponse({ status: 403, description: 'Forbidden (Requires Admin role)' }),
  );
}

export function ApiFindAllEmployeesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find All Employees',
      description: 'Retrieves a paginated list of all employees (Admin only).',
    }),
    ApiQuery({ type: PaginationQueryDto }),
    ApiResponse({
      status: 200,
      description: 'Paginated employee list.',
    }),
  );
}

export function ApiFindOneEmployeeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Find Employee by ID',
      description: 'Retrieves employee details by UUID.',
    }),
    ApiParam({ name: 'id', description: 'Employee UUID', example: '18fbd92e-e5e9-4e3e-a9a3-b98f2512b2a4' }),
    ApiResponse({ status: 200, description: 'Employee details found.' }),
    ApiResponse({ status: 404, description: 'Employee not found.' }),
  );
}

export function ApiUpdateEmployeeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update Employee',
      description: 'Updates an employee record by UUID.',
    }),
    ApiParam({ name: 'id', description: 'Employee UUID', example: '18fbd92e-e5e9-4e3e-a9a3-b98f2512b2a4' }),
    ApiBody({ type: UpdateEmployeeDto }),
    ApiResponse({ status: 200, description: 'Employee updated successfully.' }),
    ApiResponse({ status: 404, description: 'Employee not found.' }),
  );
}

export function ApiRemoveEmployeeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete Employee',
      description: 'Deletes an employee record by UUID.',
    }),
    ApiParam({ name: 'id', description: 'Employee UUID', example: '18fbd92e-e5e9-4e3e-a9a3-b98f2512b2a4' }),
    ApiResponse({ status: 200, description: 'Employee removed successfully.' }),
    ApiResponse({ status: 404, description: 'Employee not found.' }),
  );
}

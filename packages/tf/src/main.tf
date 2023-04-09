terraform {
	required_providers {
		aws = {
			source = "hashicorp/aws"
			version = "~> 4.0"
		}
	}
}

provider "aws" {
	region = "us-east-2"
}

resource "aws_dynamodb_table" "hwebs-info-table" {

	name = "hwebs-info-table"
	billing_mode = "PROVISIONED"
	read_capacity = 5
	write_capacity = 5
	hash_key = "id"
	range_key = "type"
	
	attribute {
		name = "id"
		type = "S"
	}

	attribute {
		name = "type"
		type = "S"
	}

	attribute {
		name = "category"
		type = "S"
	}

	global_secondary_index {
		name = "post-index"
		hash_key = "category"
		range_key = "id"
		projection_type = "ALL"
		read_capacity = 5
		write_capacity = 5
	}
}

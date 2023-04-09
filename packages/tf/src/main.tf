terraform {
	required_providers {
		aws = {
			source = "hashicorp/aws"
			version = "~> 4.0"
		}
	}
}

provider "aws" {
	# TODO get from env 
	region = "us-east-2"
}

resource "aws_dynamodb_table" "hwebs_info_table" {
	# TODO get from env
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

data "aws_iam_policy_document" "hwebs_info_dynamodb_ro_policy" {
	statement {
		actions = ["dynamodb:DescribeTable", "dynamodb:Query", "dynamodb:Scan", "dynamodb:GetItem"]
		resources = [resource.aws_dynamodb_table.hwebs_info_table.arn]
	}
}

resource "aws_iam_role" "hwebs_info_dynamodb_ro_role" {
	name = "hwebs-info-dynamodb-ro"
	assume_role_policy = data.aws_iam_policy_document.hwebs_info_dynamodb_ro_policy.json
}
